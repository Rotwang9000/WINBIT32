import './App.css';
import './buttons.css'
import { Chain, FeeOption } from "@thorswap-lib/types";
import { keystoreWallet } from '@thorswap-lib/keystore';
import {
  AssetAmount,
  createSwapKit,
  WalletOption,
  SwapKitApi,
  Amount
} from "@thorswap-lib/swapkit-sdk";
import { entropyToMnemonic, generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { useEffect, useState, useRef,  } from "react";
import QRCode from "react-qr-code";
import "dotenv/config";


var floatToString = function(flt) {
  var rx = /^([\d.]+?)e-(\d+)$/;
  var details, num, cnt, fStr = flt.toString();
  if (rx.test(fStr)) {
    details = rx.exec(fStr);
    num = details[1];
    cnt = parseInt(details[2], 10);
    cnt += (num.replace(/\./g, "").length - 1); // Adjust for longer numbers
    
    num = flt.toFixed(cnt);
    //fix at 8 decimal places displayed not scientific notation
    if(cnt > 8){
      num = flt.toFixed(8);
    }
    fStr = num.toString();
    fStr = fStr.replace(/\.?0+$/, ""); // Remove any trailing zeros
    return fStr;
    
  }
  return fStr;
};

  var quoteCnt = 0;

  var lastQuoteDetails = {
    destAmtTxt: "",
    time: 0,
    sendingWalletBalance: 0,
    transferType: [],
    streamSwap: false,
  };

  var countdownTimer = null;
  var swapID = ''; //only do one swap at once!
  var countdownNumber = 11;
  var numWalletChecks = 0;
  var walletTimer = null;

const styles = {
  container: {
    width: "99%",
    maxWidth: "1000px",
    margin: "0 auto",
  },
  input: {
    width: "100%",
  },

};

var validAddresses = {}

const skClient = createSwapKit({
  config: {
    utxoApiKey: "A___UmqU7uQhRUl"+"4UhNzCi5LOu81LQ1T",
    covalentApiKey: "cqt_rQygB4xJkdv" + "m8fxRcBj3MxBhCHv4",
    ethplorerApiKey: "EK-8ftjU-" + "8Ff7UfY-JuNGL",
    walletConnectProjectId: "",
  },
  wallets: [keystoreWallet],
});


const chains = {'ETH':Chain.Ethereum, 'BTC':Chain.Bitcoin, 'DOGE': Chain.Dogecoin,  'THOR':Chain.THORChain, };
//get chains values as list
const connectChains = Object.values(chains);
const chainIDs = ["ETH", "BTC"];
const fromTypes = ["ETH.ETH", "BTC.BTC","DOGE.DOGE"];// "ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48", "ETH.WETH-0XC02AAA39B223FE8D0A0E5C4F27EAD9083C756CC2", "ETH.WBTC-0X2260FAC5E5542A773AA44FBCFEDF7C193BC2C599"];
const toTypes = ["ETH.ETH", "BTC.BTC", "ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48", "DOGE.DOGE"];
const typeInfo = {
  'ETH.ETH':{'shortname':'ETH'}, 
  'BTC.BTC':{'shortname':'BTC'}, 
  'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48':{'shortname':'USDC'},
  'ETH.WETH-0XC02AAA39B223FE8D0A0E5C4F27EAD9083C756CC2':{'shortname':'WETH'},
  'ETH.WBTC-0X2260FAC5E5542A773AA44FBCFEDF7C193BC2C599':{'shortname':'WBTC'},
  'DOGE.DOGE':{'shortname':'DOGE'},
};





function Bitx(props) {



  const [devButtons, setDevButtons] = useState(false);
  const [txUrl, setTXUrl] = useState("");
  const [destinationAddr, setDestinationAddr] = useState("");
  if(props.qrResult && props.qrResult !== destinationAddr){
	setDestinationAddr(props.qrResult);
	  }	

  //get from query string 'dest_amt' or set to 'MAX' if not set
  const [destinationAmt, setDestinationAmt] = useState("");
  const [step, setStep] = useState(1);
  const [swapLink, setSwapLink] = useState("");
  const [phrase, setPhrase] = useState("");
  const [wallets, setWallets] = useState({});
  const walletsRef = useRef(wallets);
  walletsRef.current = wallets;

  const [lastWalletGet, setLastWalletGet] = useState(0);
  const [balances, setBalances] = useState({}); // [{ balance: AssetAmount[]; address: string; walletType: WalletOption }
  const [balanceChanged, setBalanceChanged] = useState(0);
  const [originBalances, setOriginBalances] = useState(null);
  const [autoswap, setAutoswap] = useState(true);
  const [sendStats, setSendstats] = useState(true);

  const [sellAmount, setSellAmount] = useState([0, 0]);
  const sellAmountRef = useRef(sellAmount);
  sellAmountRef.current = sellAmount;

  const [slippage, setSlippage] = useState(1);
  const [routes, setRoutes] = useState([]); // [{ optimal: boolean; route: Route[] }
  const [msg, setMsg] = useState("");
  const [msgColour, setMsgColour] = useState("info_msg");
  const [transferType, setTransferType] = useState(["", ""]); //['source', 'dest'] or [] for none eg. ['BTC.BTC', 'ETH.ETH']
  const transferTypeRef = useRef(transferType);
  transferTypeRef.current = transferType;

  const [lastSwapTx, setLastSwapTx] = useState(null);
  const [lastSwapTxTime, setLastSwapTxTime] = useState(0);
  const [lastSwapBtn, setLastSwapBtn] = useState(null);
  const [differenceFromSellTxt, setDifferenceFromSellTxt] = useState('');
  const [sellAmountTxt, setSellAmountTxt] = useState('');
  const [qrReaderOpen, setQrReaderOpen] = useState(false);
  const [streamingAvailable, setStreamingAvailable] = useState(false);
  const [streamingVars, setStreamingVars] = useState({});
  const [streamingSwap, setStreamingSwap] = useState(false);

  function isDevMode() {
    if (window.location.hostname === "localhost") {
      return true;
    } else {
      return false;
    }
  }

  const devMode = isDevMode();


  function setError(msg) {
    console.log("settingg error", msg)
    if (typeof msg === "object") {
      msg = msg.message;
    }
    //if msg includes [ThornodeService.fetchQuote] 
    if (msg.includes('[ThornodeService.fetchQuote]')){
      msg = <>Failed to fetch quote. Fee may be higher than output. Increase the amount and  <button 
      onClick={() => {
        getAQuote(true);
      }}  className="link">
      Try Again
      </button></>;
    }
    if (msg === "Failed to fetch") {
      msg = <>Service Provider Error. Please try again later.<br />As long as you remember <button 
      onClick={() => {
        setStep(1);
      }}  className="link">
      The Phrase</button>, no funds are lost</>
    }
    if(msg === "core_transaction_deposit_error"){
      msg = "Failed to send the funds to the converter. Please try again later.";
    }
    setMsg(msg);
    setMsgColour("error_msg");
  }
  function setInfo(msg, isHTML = false) {
    // if (isHTML) {
    //   //message is raw html to be set as Msg to go in as is without escaping
    //   setMsg(msg);
    
    // }
	console.log('setting info:', msg);
    setMsg(msg);
    setMsgColour("info_msg");
    
  }


  function balanceAssetAmount(wallet, asString = false) {
    if(!wallet || !wallet.balance || !wallet.balance[0] || !wallet.balance[0].assetAmount) return 0;
    if(asString) return wallet.balance[0].assetAmount.toString();
    return parseFloat(wallet.balance[0].assetAmount);
  }
  
  function walletAddress(wallet, chain = null) {
    if(!wallet || !wallet.address){
      //get the address of the first wallet on the chain
      if(!chain){
        console.log("no address and no chain for this wallet");
        return null;

      }   
      chain = chain.split(".")[0];
      const _wallets = walletsRef.current;
      //wallets is dict so can't use length.. for each...
      for (var i in _wallets) {
        if(_wallets[i].balance[0].asset.chain === chain){
          //console.log("got wallet from chain", chain)
          return _wallets[i].address;
        }
      }
    }else{
      return wallet.address;
    }
  }

  function shortName(fullSymbol){
    if(!typeInfo[fullSymbol]) return fullSymbol;
    return typeInfo[fullSymbol].shortname;
  }

  function wallet(fullSymbol) {
    //get wallet from full symbol
    var wsplit = fullSymbol.split(".");
    if (wsplit.length !== 2) wsplit = fullSymbol.split("/");

    var chain = wsplit[0];
    var symbol = wsplit[1];

    const _wallets = walletsRef.current;
    const _wallet = _wallets[fullSymbol.toUpperCase()];

    return _wallet;
  }

  function generatePhrase(size = 12) {
    const entropy = size === 12 ? 128 : 256;

    return generateMnemonic(wordlist, entropy);
  }

  async function send_quote() {
    //get a quote from the api for sending an asset
    const sendingWallet = selectSendingWallet();
    if (!sendingWallet) {
      console.log("no sending wallet");
      return;
    }
    
    const walletChain = sendingWallet.balance[0].asset.chain;

    const destAmt = document.getElementById("destination_amt").value;
    if (!destAmt) {
      console.log("no dest amt");
      return;
    }
    if(isNaN(destAmt)){
      console.log("dest amt is not a number");
      return;
    }


    //get a quote from sendingwallet to a thor address: thor1xg0zsvnqn8v68aaswcv9jdff2u75zz8yfve6et
    const quoteParams = {
      sellAsset: walletChain + "." + sendingWallet.balance[0].asset.symbol,
      buyAsset: "THOR.RUNE",
      senderAddress: sendingWallet.address, // A valid Bitcoin address
      recipientAddress: "thor1xg0zsvnqn8v68aaswcv9jdff2u75zz8yfve6et", // A valid Ethereum address
      slippage: slippage, // 1 = 1%
      sellAmount: destAmt,
      affiliateBasisPoints: 0, //100 = 1%
      affiliateAddress: "me",
      preferredProvider: "THORCHAIN",
    };

    console.log("quoteParams", quoteParams);

    var routes = await SwapKitApi.getQuote(quoteParams);
    console.log('routes', routes);
    //get sending network fee from the quote
    var feesArray = routes.routes[0].fees[Object.keys(routes.routes[0].fees)[0]][0];
    var fees = parseFloat(feesArray.totalFee.toString()) * 1.2;

    setSellAmount([parseFloat(destAmt)+fees, fees]);
    setStreamingAvailable(false);

      // return baseAmount(balance.amount.minus(baseAmount(fee, 8)).amount(), 8);

    console.log("routes", fees);
  }


  function validAddress(address, chain) {
    if(validAddresses[chain] && validAddresses[chain][address] === true) return true;
    if(validAddresses[chain] && validAddresses[chain][address] === false) return false;
    
    if(!validAddresses[chain]) validAddresses[chain] = {};
      //validate from thorswap api

    const res = skClient.validateAddress({'address':address, 'chain':chains[chain]});
    console.log("validateAddress " + chains[chain] + " " + address, res);
    validAddresses[chain][address] = res;
  
    return  validAddresses[chain][address];
  }


  async function send_funds() {
    //used when send and receive tokens are the same, it sends it to the destination address
    //get the right wallet for each asset
    const sendingWallet = selectSendingWallet();
    if (!sendingWallet) {
      console.log("no sending wallet");
      return;
    }
    const recvAddress = document.getElementById("destination_addr").value;
    if (!recvAddress) {
      console.log("no recv address");
      setError("No address");
      return;
    }
    const sendChain = sendingWallet.balance[0].asset.chain;
    if(!validAddress (recvAddress, sendChain)){
      console.log("invalid address");
      setError("Invalid address");
      return;
    }

    // transfer: (params: CoreTxParams & {
    //     router?: string;
    // }) => Promise<string>;

    //CoreTxParams:
    // assetAmount: AssetAmount;
    // recipient: string;
    // memo?: string;
    // feeOptionKey?: FeeOption;
    // feeRate?: number;
    // data?: string;
    // from?: string;
    //get transfer quote

// export declare class Amount {
//     readonly assetAmount: BigNumber;
//     readonly baseAmount: BigNumber;
//     readonly decimal: number;
//     static fromMidgard(amount?: BigNumber.Value): Amount;
//     static fromBaseAmount(amount: BigNumber.Value, decimal: number): Amount;
//     static fromAssetAmount(amount: BigNumber.Value, decimal: number): Amount;
//     static fromNormalAmount(amount?: BigNumber.Value): Amount;
//     static sorter(a: Amount, b: Amount): number;
//     constructor(amount: BigNumber.Value, type: AmountType | undefined, decimal: number);
//     add(amount: Amount): Amount;
//     sub(amount: Amount): Amount;
//     mul(value: BigNumber.Value | Amount): Amount;
//     div(value: BigNumber.Value | Amount): Amount;
//     gte(amount: Amount | BigNumber.Value): boolean;
//     gt(amount: Amount | BigNumber.Value): boolean;
//     lte(amount: Amount | BigNumber.Value): boolean;
//     lt(amount: Amount | BigNumber.Value): boolean;
//     eq(amount: Amount | BigNumber.Value): boolean;
//     toSignificant(significantDigits?: number, maxDecimals?: number, format?: BigNumber.Format, rounding?: Rounding): string;
//     toFixedDecimal(decimalPlaces?: number, format?: BigNumber.Format, rounding?: Rounding): string;
//     toFixed(decimalPlaces?: number, format?: BigNumber.Format, rounding?: Rounding): string;
//     toAbbreviate(decimalPlaces?: number): string;
//     toMidgard(): Amount;
//     private toSignificantBigNumber;
// }

// export declare enum AmountType {
//     BASE_AMOUNT = 0,
//     ASSET_AMOUNT = 1
// }


    var toolbox = skClient.connectedWallets[sendChain];
    var amt = new AssetAmount(sendingWallet.balance[0].asset, new Amount(sellAmountRef.current[0] - sellAmountRef.current[1], 1, sendingWallet.balance[0].asset.decimal));


    console.log("amt", amt);
    const txData = {
      assetAmount: amt,
      recipient: recvAddress,
      //memo: "",
      feeOptionKey: FeeOption.Average,
      //feeRate: 1,
      //data: "",
      from: sendingWallet.address,
    };

    const txID = await skClient
      .transfer(txData)
      .then((result) => {
        console.log("result", result);

        setDoSwapCountdown(false);
        // Returns explorer url like etherscan, viewblock, etc.
        const explorerUrl = skClient.getExplorerTxUrl(sendChain, result);
        setTXUrl(explorerUrl);
        setInfo(
          <>
            Send Started!{" "}
            <a href={explorerUrl} target="_blank">
              View TX
            </a>
          </>
        );
        logTX(result, txData); 
        setLastSwapTx(result);
        setLastSwapTxTime(Date.now());
        setLastSwapBtn(
          <>
            <div className="info_msg">
              Send Started!{" "}
              <a href={explorerUrl} target="_blank">
                View TX
              </a>
            </div>
          </>
        );
        return result;
      })

      .catch((error) => {
        console.log(error);
        setError(error);
        logTX(error, txData);
        console.log("swapParams", sendChain);
        //log balances of sending wallet
        _wallet = selectSendingWallet();
        console.log("sendingwallet", _wallet);

        setAutoswap(false);

        return null;
      });

  }


   async function getCachedPrice(token = 'ETH.ETH'){
    //    getCachedPrices: ({ tokens, ...options }: CachedPricesParams) => Promise<CachedPricesResponse[]>;
    //    export declare type CachedPricesParams = {
    //     tokens: {
    //         identifier: string;
    //     }[];
    //     metadata?: 'true' | 'false';
    //     lookup?: 'true' | 'false';
    //     sparkline?: 'true' | 'false';
    // };


    var tokens = [{'identifier':token}];
    var options = {'metadata':'false', 'lookup':'false', 'sparkline':'false'};
    const res = await SwapKitApi.getCachedPrices({'tokens':tokens, ...options}).then((result) => {
        console.log("getCachedPrices", result);
        try{
          return result[0].price_usd;
        }catch(e){
          return 0;
        }
    }).catch((error) => {
        console.log(error);
        return null;
    });

    return res;

  }

// const isApproved = skClient.isAssetApprovedForContract(
//   asset, // AssetEntity
//   contractAddress: selectedRoute.contract
//   amount, // AmountWithBaseDenom => amount to check that's possible to spent, default MaxInt256
// )

// const approveTx = skClient.approveAssetForContract(
//   asset, // AssetEntity
//   contractAddress: selectedRoute.contract
//   amount, // AmountWithBaseDenom => amount approved to spent, default MaxInt256
// )




  async function getAQuote(osellAmt = null, loop = 0, destAmtTxt = null) {
    console.log("lastQuoteDetails", lastQuoteDetails);

    if (
      document.getElementById("destination_amt").value !== destinationAmt
    ) {
        console.log("destination amount changed");
        return;
    }

    if (sellAmount[0] === -1) return;
    if (destinationAmt !== "MAX" && isNaN(destinationAmt.replace("%", ""))) {
      console.log("not max and not %");
      return;
    }
    if (transferType.length !== 2) {
      console.log("transfer type not set");
      return;
    }
    console.log("transfertype", transferType);
    if(!transferType[1] || transferType[1].length === 0 ){
      if(step === 2){
        setInfo("Please choose a destination asset");
      }
      return;
    }

    var destAddr = document.getElementById("destination_addr").value;
    if(!destAddr || destAddr.length === 0){
      setInfo("Please enter a destination address");
      destAddr = walletAddress(wallets[transferType[1].split(".")[0]], transferType[1].split(".")[0]);
    }


    if (!validAddress(destAddr, transferType[1].split(".")[0])) {
      setError("Invalid address for " + transferType[1].split(".")[0]);
      console.log("invalid address for " + transferType[1].split(".")[0]);
      return;
    }

    if (!wallets["ETH.ETH"]) {
      setError("Please connect a wallet");
      console.log("no wallets");
      return;
    }




    if(!selectSendingWallet()){
      //if fixed amounts then info
      if(   document.getElementsByClassName("recieve_transfer_type")[0].style.display === "none"){
        setInfo("Please select the token you wish to pay with.");
        //set a green border on transfer_type
        document.getElementById("pay_transfer_type").style.border = "1px solid #00ff00";
      }else{
      
        setError("Please select the token you wish to pay with.");
      }

      console.log("no sendingwallet");
      return;
    }
    document.getElementById("pay_transfer_type").style.border = "none";

    if (
      lastQuoteDetails.destAmtTxt === destinationAmt &&
      Date.now() - lastQuoteDetails.time < 60000 &&
      osellAmt === null &&  osellAmt !== true
       &&
      lastQuoteDetails.sendingWalletBalance ===
        balanceAssetAmount(selectSendingWallet(), true) &&
      lastQuoteDetails.transferType === transferType
      && lastQuoteDetails.destAddr === destinationAddr
      && lastQuoteDetails.streamingSwap === streamingSwap
    ) {
      console.log("same quote");
     
      return;
    }
    if (osellAmt === null) {
      console.log(
        "last destamttxt",
        lastQuoteDetails.destAmtTxt,
        destinationAmt
      );
      console.log("last time", Date.now() - lastQuoteDetails.time);
      console.log(
        "last sendingWalletBalance",
        lastQuoteDetails.sendingWalletBalance
      );
    }

    if (osellAmt !== null && destAmtTxt !== lastQuoteDetails.destAmtTxt) {
      console.log("different quote!", destAmtTxt, lastQuoteDetails.destAmtTxt);
      console.log(destAmtTxt);
      return;
    }

    if (
      lastQuoteDetails.destAmtTxt !== destinationAmt ||
      lastQuoteDetails.transferType !== transferType
    ) {
      if(document.getElementById("send_to_amt"))
      document.getElementById("send_to_amt").innerHTML = "<i class='fa fa-spinner fa-spin'> </i>";
    }

    if (osellAmt === null) {
      var arr = { destAmtTxt: destinationAmt, time: Date.now() };
      //add sending wallet balance
      var sendingWallet = selectSendingWallet();
      if (sendingWallet) {
        arr["sendingWalletBalance"] =
          balanceAssetAmount(sendingWallet, true)
      }
      arr["transferType"] = transferType;
      arr["destAddr"] = destinationAddr;
      arr["streamingSwap"] = streamingSwap;
      lastQuoteDetails = arr;
      destAmtTxt = destinationAmt;
    }
    
    //setSellAmount((prev) => [sellAmt, prev[1]]);

    //if destination amount is MAX, get the balance of the destination wallet and use that as the destination amount
    var _sendWallet = selectSendingWallet();
    if (
      osellAmt === null &&
      (destinationAmt === "MAX" || // or contains a % sign
        destinationAmt.substring(destinationAmt.length - 1) === "%") &&
      _sendWallet &&
      _sendWallet.balance[0] &&
      _sendWallet.balance[0].assetAmount > 0
    ) {
      var bal = balanceAssetAmount(_sendWallet.balance[0].assetAmount);
      var pct = parseFloat(destinationAmt.replace("%", ""));
      if (isNaN(pct)) pct = 100;
      var sellAmt = bal * (pct / 100);
      console.log("sellAmt", sellAmt);
      return getAQuote(sellAmt, loop + 1, destAmtTxt);
    }

    console.log("getting quote");

    var assets = [];
    for (var i = 0; i < transferType.length; i++) {
      if (transferType[i] === "ETH.ETH") {
        assets.push("ETH.ETH");
      } else if (transferType[i] === "BTC.BTC") {
        assets.push("BTC.BTC");
      }else{
        assets.push(transferType[i].toUpperCase());
      }
    }

    console.log("assets", assets);
    console.log("wallets", wallets);
    //get the right wallet for each asset
    // var walletsForAssets = [];
    // for (var i = 0; i < assets.length; i++) {
    //   for (var j = 0; j < 2; j++) {
    //     if (
    //       wallets[j].balance[0].asset.chain 
    //         "." +
    //         wallets[j].balance[0].asset.symbol ===
    //       assets[i]
    //     ) {
    //       walletsForAssets.push(wallets[j]);
    //     }
    //   }
    // }


    if(transferType[0] === transferType[1]){
      //same to same
      return send_quote();
    }

    const affiliateBasisPoints =  10; //100 = 1%

    const quoteParams = {
      sellAsset: assets[0],
      buyAsset: assets[1],
      senderAddress: walletAddress(wallets[assets[0]], assets[0]), // A valid Bitcoin address
      recipientAddress: destinationAddr, // A valid Ethereum address
      slippage: slippage, // 1 = 1%
      preferredProvider: "THORCHAIN",
    };

    var testAmt = 1000;
    var oopFees = 0;
    var sellAmt = osellAmt;
    if (Array.isArray(sellAmt)) {
      oopFees = sellAmt[1];
      sellAmt = sellAmt[0];
    }
    if (osellAmt !== null) {
      quoteParams.sellAmount = sellAmt - oopFees;
      testAmt = sellAmt - oopFees;
      quoteParams.affiliateBasisPoints = affiliateBasisPoints; //100 = 1%
      quoteParams.affiliateAddress = "me";
    } else {
      const cp0 = await getCachedPrice(assets[0]);
      const cp1 = await getCachedPrice(assets[1]);
      console.log("cp0,1", cp0, cp1);
      if(cp0 && cp0 > 0){
        testAmt = 1000 / cp0;
        if(cp1 && cp1 > 0){
          testAmt = (parseFloat(destinationAmt) * cp1) / cp0;
        }
      }

      //calculate the rate so we can calculate the sell amount to get the right destination amount
      quoteParams.sellAmount = testAmt;
      quoteParams.affiliateBasisPoints = 0; //100 = 1%
      quoteParams.affiliateAddress = "me";
    }

    console.log("quoteParams", quoteParams);

    const thisQuoteCnt = quoteCnt;
    quoteCnt++;

    var routes = await SwapKitApi.getQuote(quoteParams).catch((error) => {
      console.log(error);
      //if error.message begins with Internal Server Error, change message
      if (error.message.startsWith("Internal Server Error")) {
        error.message = "Amount too low or other error";
      }
      setError(error);
      return error;
    });


    if (thisQuoteCnt !== quoteCnt - 1) {
      console.log("old quote");
      return;
    }

    if (routes.message) {
      console.log(routes.message);
      //set #error_phrase
      setError(routes.message.split(":").pop());
      if(routes.message === 'Sell and buy assets are the same.'){
        setError("Same to Same not supported yet. Soon!")
      }
      setSellAmount((prev) => [0, prev[1]]);
      return;
    }
    routes = routes.routes;

    // routes = await routes;
    console.log("routes", routes);
    if (osellAmt !== null) setRoutes(routes);
    try{
      const r = routes[0];
      if(r.streamingSwap && Object.keys(r.streamingSwap).length > 1){
        const rs = r.streamingSwap;
        var _ssvar = { duration: rs.estimatedTime };
        const durationX = rs.estimatedTime  / r.estimatedTime ;
        _ssvar["durationx"] = durationX;
        const savingspc = (rs.expectedOutput - r.expectedOutput) / r.expectedOutput * 100;
        _ssvar["savingspc"] = savingspc;
        setStreamingVars(_ssvar);
        console.log("streamingvar", _ssvar);


        if(document.getElementById("streaming_swap") && document.getElementById("streaming_swap").checked){
          //use streaming swap values from rs in r
          for (var i = 0; i < Object.keys(rs).length; i++) {
            //get the key of i object in rs
            const rskey = Object.keys(rs)[i];
            routes[0][rskey] = rs[rskey];
            console.log("rskey", rskey);
          }
          

        }
        
        if (r.expectedOutputUSD > 100000) {
          //if expected output is more than 100k, then force streaming swap
          setStreamingSwap(true);
          if (document.getElementById("streaming_swap")) {
            document.getElementById("streaming_swap").checked = true;
            document.getElementById("streaming_swap").disabled = true;
          }
          setInfo("Streaming swap is required for larger amounts.");
        } else if (document.getElementById("streaming_swap")) {
          document.getElementById("streaming_swap").disabled = false;
        }


      }
      setStreamingAvailable(routes[0].meta.hasStreamingSwap);    
    }catch(e){
      setStreamingAvailable(false);
    }

    if (routes === undefined) {
      setSellAmount((prev) => [0, prev[1]]);
      console.log("no routes");
      return;
    }
    //if expectedOutputMaxSlippage is 0 then there is no route
    if (routes[0].expectedOutputMaxSlippage === 0) {
      setSellAmount((prev) => [0, prev[1]]);
      console.log("no route");

      return;
    }



    var eoms_pc = 1;
    var outOfPocketFees = 0;
    var feesUSD = 0;
    var sourceAssetFees = 0;
    var destAssetFees = 0;
    var destAssetFeesNoAffilliate = 0;
    var affDiff = 0;
    var feesArray = routes[0].fees[Object.keys(routes[0].fees)[0]];
    console.log("feesArray", feesArray);

     for (var fi = 0; fi < feesArray.length; fi++) {
        var fee = feesArray[fi];
        var feeUSD = parseFloat(fee.totalFeeUSD.toString());
        if (fee.type === "inbound") {
          if (fee.isOutOfPocket) {
            outOfPocketFees += parseFloat(fee.totalFee.toString());
            console.log("outOfPocketFees", outOfPocketFees);

          } else {
            sourceAssetFees += fee.totalFee;
          }
        } else if(fee.type === "outbound"){
            feesUSD += feeUSD;
            destAssetFees += fee.totalFee;
            destAssetFeesNoAffilliate += fee.totalFee 
            if(fee.affiliateFee > 0){
              destAssetFeesNoAffilliate -= fee.affiliateFee;


              //WORKAROUND THE BUG - Affilliate fee is in source asset, not dest asset. USD amt is not correct eiter.
              //convert  affiliateFee to destination asset using networkfee to networkfeeusd ratio on both sides of the fees
              var sourcefees = feesArray.filter(f => f.type === "inbound")[0];
              var sourceRatio = sourcefees.totalFeeUSD / sourcefees.totalFee;              
              var destRatio = fee.networkFeeUSD / fee.networkFee;

              var affiliateFee = fee.affiliateFee * sourceRatio / destRatio;

              console.log("corrected aff fee", affiliateFee);
              affDiff = fee.affiliateFee - affiliateFee;

              fee.affiliateFee = affiliateFee;

              

              destAssetFees = destAssetFeesNoAffilliate + affiliateFee;



            }

            if(fee.slipFee < 0){
              //if slip fee is negative, then it's a refund
              destAssetFees -= fee.slipFee;
              destAssetFeesNoAffilliate -= fee.slipFee;
            }
          }

        
        //remvoe slip fee if it exists
        // if (fee.slipFeeUSD && sellAmt === 0) {
        //   fees -= parseFloat(fee.slipFeeUSD.toString());
        //   fees += 5;
        // }
      } 
    //if expectedOutputMaxSlippage is more than 1% out either way, calculate again
    if (!isNaN(destinationAmt)) {
      //calculate out of pocket fees
      var _destAmt = parseFloat(destinationAmt) + destAssetFees;
      eoms_pc =
        parseFloat(routes[0].expectedOutputMaxSlippage.toString()) /
        (_destAmt );
      // if(destAssetFeesNoAffilliate == destAssetFees){
      //   eoms_pc -= 0.01;
      // }
      //get abs difference
      eoms_pc = Math.abs(eoms_pc - 1) * 100;
      console.log("destinationAmt", destinationAmt);
      console.log("destAssetFees", destAssetFees);
      console.log("expectedOutputMaxSlippage", routes[0].expectedOutputMaxSlippage.toString());
      console.log("eoms_pc", eoms_pc);
    }
    var eoms_ok = false;
    //permit 3% eoms_pc below 500 usd, 1% above 500 usd
    if (parseFloat(routes[0].expectedOutputUSD.toString()) < 500) {
      if (
        eoms_pc < 3 ||
        (parseFloat(routes[0].expectedOutputUSD.toString()) < 20 && eoms_pc < 5)
      ) {
        eoms_ok = true;
      }
    } else {
      if (eoms_pc < 1) {
        eoms_ok = true;
      }
    }

    if (osellAmt !== null) {
      //calulate USD difference of requested amount.
      var destAmtUSDRate =
        parseFloat(routes[0].expectedOutputUSD.toString()) /
        parseFloat(routes[0].expectedOutput.toString());
      var destAmtUSD = destAmtUSDRate * (parseFloat(destinationAmt) + destAssetFees);
      var diffUSD =
        destAmtUSD - parseFloat(routes[0].expectedOutputUSD.toString());
      //if diffUSD is less than 5, then allow it
      console.log("diffUSD", diffUSD);
      if (Math.abs(diffUSD) < 5) {
        eoms_ok = true;
      }
      if (diffUSD < 0 && eoms_pc < 3) {
        eoms_ok = true;
      }
    }

    if (loop > 3 && eoms_ok === false &&  routes[0].meta.hasStreamingSwap === true) {
      //turn stream swap on
      setStreamingSwap(true);
      document.getElementById("streaming_swap").checked = true;

    }


    if (loop > 5 && eoms_ok === false) {
      //if we've tried 5 times, give up
      // setDestinationAmt(routes[0].expectedOutputMaxSlippage.toString());
      //setSellAmount([sellAmt, outOfPocketFees]);
      setError("Cannot calculate amount to send. Please try again later.");
      console.log("giving up");
      setRoutes(routes);
      return;
      //eoms_pc = 1;
    }

    if (osellAmt === null || eoms_ok === false) {
      //calculate the sell amount to get the right destination amount
      var r = routes[0];
      //routes:
      /*{
    "quoteId": "566c313a-0978-484e-80e9-1366072aeda4",
    "routes": [
        {
            "path": "ETH.ETH -> BTC.BTC",
            "providers": [
                "THORCHAIN"
            ],
            "subProviders": [
                "THORCHAIN"
            ],
            "swaps": {
                "THORCHAIN": [
                    [
                        {
                            "from": "ETH.ETH",
                            "to": "BTC.BTC",
                            "parts": [
                                {
                                    "provider": "THORCHAIN",
                                    "percentage": 100
                                }
                            ]
                        }
                    ]
                ]
            },
            "expectedOutput": "0.06279409",
            "expectedOutputMaxSlippage": "0.06096513592233009709",
            "expectedOutputUSD": "1630.8651348600024",
            "expectedOutputMaxSlippageUSD": "1583.364208601944",
            "transaction": null,
            "optimal": true,
            "complete": false,
            "fees": {
                "THOR": [
                    {
                        "type": "inbound",
                        "asset": "ETH.ETH",
                        "networkFee": 0.000760648,
                        "networkFeeUSD": 1.2465119100000002,
                        "affiliateFee": 0,
                        "affiliateFeeUSD": 0,
                        "totalFee": 0.000760648,
                        "totalFeeUSD": 1.2465119100000002,
                        "isOutOfPocket": true
                    },
                    {
                        "type": "outbound",
                        "asset": "BTC.BTC",
                        "networkFee": 0.000135,
                        "networkFeeUSD": 3.506009550392559,
                        "affiliateFee": 0.003,
                        "affiliateFeeUSD": 4.912025876869637,
                        "isOutOfPocket": false,
                        "slipFee": 0.00001256133026605321,
                        "slipFeeUSD": 0.32623827462692584,
                        "totalFee": 0.0031475613302660533,
                        "totalFeeUSD": 8.744273701889123
                    }
                ]
            },
            "meta": {
                "hasStreamingSwap": false,
                "sellChain": "ETH",
                "sellChainGasRate": "30",
                "buyChain": "BTC",
                "buyChainGasRate": "13",
                "priceProtectionRequired": false,
                "priceProtectionDetected": true,
                "quoteMode": "TC-TC",
                "lastLegEffectiveSlipPercentage": 3.0000000000000027,
                "thornodeMeta": {
                    "expectedAmountOut": "0.06279409",
                    "expectedAmountOutStreaming": "0.06279409",
                    "dustThreshold": null,
                    "inboundConfirmationBlocks": 1,
                    "inboundConfirmationSeconds": 15,
                    "outboundDelayBlocks": 11,
                    "outboundDelaySeconds": 66,
                    "notes": "Base Asset: Send the inbound_address the asset with the memo encoded in hex in the data field. Tokens: First approve router to spend tokens from user: asset.approve(router, amount). Then call router.depositWithExpiry(inbound_address, asset, amount, memo, expiry). Asset is the token contract address. Amount should be in native asset decimals (eg 1e18 for most tokens). Do not send to or from contract addresses.",
                    "warning": "Do not cache this response. Do not send funds after the expiry.",
                    "fees": {
                        "affiliate": "18935",
                        "asset": "BTC.BTC",
                        "liquidity": "1426",
                        "outbound": "13500",
                        "slippage_bps": 2,
                        "total": "33861",
                        "total_bps": 53
                    },
                    "streamingSwapBlocks": 0,
                    "totalSwapSeconds": 81,
                    "maxStreamingSwaps": 1
                },
                "providerBuyAssetAmount": {
                    "buyAmount": "6279409",
                    "chain": "BTC",
                    "symbol": "BTC",
                    "ticker": "BTC"
                },
                "warnings": [
                    {
                        "warningCode": "2002",
                        "warningMessage": "Destination address is not provided. Cannot provide a transaction object in response."
                    }
                ]
            },
            "inboundAddress": "0x02664d9678886ded80621c6b868327c55d8fa39d",
            "targetAddress": "0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146",
            "estimatedTime": 81,
            "calldata": {
                "fromAsset": "ETH.ETH",
                "userAddress": "0x8F29dcA3b21a3196F24E9b526E090DbbA09cfe73",
                "assetAddress": "0x0000000000000000000000000000000000000000",
                "amountIn": "1000000000000000000",
                "amountOut": "6279409",
                "amountOutMin": "6096513",
                "memo": "=:b:{recipientAddress}:6096514:t:30",
                "memoStreamingSwap": "",
                "expiration": 1693817079,
                "tcVault": "0x02664d9678886ded80621c6b868327c55d8fa39d",
                "tcRouter": "0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146"
            },
            "contract": "0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146",
            "contractMethod": "depositWithExpiry",
            "contractInfo": "Send transaction directly to THORChain for this TC-TC transaction.",
            "approvalTarget": "0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146",
            "approvalToken": null,
            "index": 0
        }
    ]
} */
      if (!r) {
        setSellAmount((prev) => [0, prev[1]]);
        return;
      }

      //calculate sell amount, taking fee into account and adding for slippage
      console.log("FeesUSD", feesUSD);
      //get destination amount
      var destAmt = parseFloat(destinationAmt);
      //if is 'max' or a %, then use the balance of the sending wallet
      if (
        destinationAmt === "MAX" ||
        destinationAmt.substring(destinationAmt.length - 1) === "%"
      ) {
        console.log("using sending wallet balance");
        //Maybe use estimateMaxSendableAmount
        var newsellAmt = [
          balanceAssetAmount(selectSendingWallet()) -
          outOfPocketFees,
        ];
        if (destinationAmt.substring(destinationAmt.length - 1) === "%") {
          var pct = parseFloat(destinationAmt.replace("%", ""));
          if (isNaN(pct)) pct = 100;
          newsellAmt[0] = newsellAmt[0] * (pct / 100);
        }
        return getAQuote(newsellAmt, loop + 1, destAmtTxt);

        // destAmt = parseFloat(wallets[selectSendingWallet(true)].balance[0].assetAmount.toString());
      }

      console.log(destAmt);

      //get total fees in dest asset
      var destAssetUSDRate =
        parseFloat(r.expectedOutputUSD.toString()) /
        parseFloat(r.expectedOutput.toString());

      console.log("destAssetUSDRate", destAssetUSDRate);
      //var destAssetFees = feesUSD / destAssetUSDRate;

      //get source asset usd rate from first fee
      var sourceAssetUSDRate =
        parseFloat(r.fees[Object.keys(r.fees)[0]][0].totalFeeUSD.toString()) /
        parseFloat(r.fees[Object.keys(r.fees)[0]][0].totalFee.toString());

      console.log("sourceAssetUSDRate", sourceAssetUSDRate);

      //testAmt = testAmt - outOfPocketFees;
      //get rate
      const slipRate = 1 + slippage / 100;
      var rate =
        (parseFloat(r.expectedOutputMaxSlippage.toString()) )  /
        testAmt;

      
      
      //var rate = sourceAssetUSDRate / (destAssetUSDRate * 1.01);
      console.log(rate);

      var sourceAssetDestFees = destAssetFees /rate;
      //var sourceAssetDestFees = feesUSD / sourceAssetUSDRate;

      //rate = parseFloat(r.expectedOutputMaxSlippage.toString() + destAssetFees) / testAmt;
      console.log("sourceAssetDestFees", sourceAssetDestFees);
      console.log("destAssetFees", destAssetFees);
      //consider fees in rate
      console.log("rate", rate);
      //callculate affiliate fees %
      //var affiliateFeesPct = 1; //affiliateBasisPoints / 100; // affiliateFees / destAssetUSDRate
      // console.log("affiliateFeesPct", affiliateFeesPct);
      //calculate affiliate rate pct
      console.log("DAF DAFNA", destAssetFees, destAssetFeesNoAffilliate);
      var affiliateFees = destAssetFees - destAssetFeesNoAffilliate;
      console.log("affiliateFees", affiliateFees)
      var affiliateFeesPct = affiliateBasisPoints / 100; // affiliateFees / destAssetUSDRate
      console.log("affiliateFeesPct", affiliateFeesPct);

      var newsellAmt = (destAmt + destAssetFees) / rate;

      console.log(
        "newsellAmt, aff, affusd",
        newsellAmt,
        newsellAmt * (affiliateFeesPct / 100), newsellAmt * (affiliateFeesPct / 100) * sourceAssetUSDRate
      );
      console.log(
        "newsellAmt USD, aff USD",
        newsellAmt * sourceAssetUSDRate,
        newsellAmt * sourceAssetUSDRate * (affiliateFeesPct / 100)
      );

      //newsellAmt = newsellAmt * (1 + affiliateFeesPct / 100);
      newsellAmt = newsellAmt + outOfPocketFees + 0.00000547;

      //newsellAmt = newsellAmt + sourceAssetDestFees;
      console.log(newsellAmt);
      return getAQuote([newsellAmt, outOfPocketFees, false], loop + 1, destAmtTxt);
    } else {
      console.log("we good: " + eoms_pc);
      console.log(routes);
      var requiresApproval  = false;
      //if chain is ETH, then we need to check approval:
      if (transferType[0].split(".")[0] === "ETH" && transferType[0] !== 'ETH.ETH') {
        //check approval

          var isApproved = false;
          if(!selectSendingWallet() || !selectSendingWallet().balance || !balanceAssetAmount(selectSendingWallet(), false)) {
            isApproved = false;
          }else{
            const asset = selectSendingWallet().balance[0].asset;
// 
// import type { BigNumber, FixedNumber } from "@ethersproject/bignumber";

// type AmountWithDenom<U = BigNumber | FixedNumber> = {
//   amount: () => U,
//   plus: (value: U | AmountWithDenom<U>, decimal?: number) => AmountWithDenom<U>,
//   minus: (
//     value: U | AmountWithDenom<U>,
//     decimal?: number
//   ) => AmountWithDenom<U>,
//   times: (
//     value: U | AmountWithDenom<U>,
//     decimal?: number
//   ) => AmountWithDenom<U>,
//   div: (value: U | AmountWithDenom<U>, decimal?: number) => AmountWithDenom<U>,
//   gt: (value: U | AmountWithDenom<U>) => boolean,
//   gte: (value: U | AmountWithDenom<U>) => boolean,
//   lt: (value: U | AmountWithDenom<U>) => boolean,
//   lte: (value: U | AmountWithDenom<U>) => boolean,
//   eq: (value: U | AmountWithDenom<U>) => boolean,
//   decimal: number,
// };

// export type AmountWithBaseDenom = AmountWithDenom<BigNumber>;

            var _amt = new Amount(
             sellAmt ,
              1,
              18
            );


              
            
              

            isApproved = await skClient.isAssetApprovedForContract({
                          asset, // AssetEntity
                          contractAddress: routes[0].contract,
                          amount: _amt // AmountWithBaseDenom => amount to check that's possible to spent, default MaxInt256
                        }
                ).then((result) => {
                  console.log("isApproved...", result);
                  return result;
                }).catch((error) => {
                  console.log(error);
                  return false;
                }
                );
          }

        console.log("isApproved", isApproved);
        if(!isApproved){
          requiresApproval = true;
          //get the gas rate and add 100,000gwei * rate to outOfPocketFees
          const gasRate = await getGasPrice(transferType[0]);
          console.log("gasRate", gasRate);
          if(gasRate){
            outOfPocketFees += 100000 * gasRate;
            sellAmt += 100000 * gasRate;
          }else{
            console.log("no gas rate, adding 20% to outOfPocketFees");
            sellAmt -= outOfPocketFees;
            outOfPocketFees *= 1.2;
            sellAmt += outOfPocketFees;
          }

        }
      }


      setSellAmount([sellAmt, outOfPocketFees * 1.2, requiresApproval]);
      destAddr = document.getElementById("destination_addr").value;
      if(destAddr && destAddr.length > 0){
        //animate scroll to div_transfer plus 100px to consider infomsgdiv
        
        document
          .getElementsByClassName("source_div")[0]
          .scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest",
          });

        


      }

      setRoutes(routes);

      doSwapIf(routes);
    }
    return routes;
  }

// https://dev-api.thorswap.net/resource-worker/gasPrice/getAll
// GET the gas price for all chains

// return:
// 200:  Gas Price information
//[{"asset":"ETH.ETH","units":"wei","gas":8000000000,"chainId":"1","gasAsset":8e-9},{"asset":"DOGE.DOGE","units":"sats","gas":500000,"chainId":"dogecoin","gasAsset":0.005},{"asset":"BSC.BNB","units":"wei","gas":3000000000,"chainId":"56","gasAsset":3e-9},{"asset":"BCH.BCH","units":"sats","gas":1,"chainId":"bitcoincash","gasAsset":1e-8},{"asset":"AVAX.AVAX","units":"wei","gas":25000000000,"chainId":"43114","gasAsset":2.5e-8},{"asset":"BTC.BTC","units":"sats","gas":24,"chainId":"bitcoin","gasAsset":2.4e-7},{"asset":"THOR.RUNE","units":"tor","gas":2000000,"chainId":"thorchain-mainnet-v1","gasAsset":0.02},{"asset":"GAIA.ATOM","units":"uatom","gas":2500,"chainId":"cosmoshub-4","gasAsset":0.0025},{"asset":"LTC.LTC","units":"sats","gas":1,"chainId":"litecoin","gasAsset":1e-8},{"asset":"BNB.BNB","units":"gwei","gas":7500,"chainId":"Binance-Chain-Tigris","gasAsset":0.000075}]
// 404: No Gas Prices for this chainId

  async function getGasPrice(asset){
    var requestedChain = asset.split(".")[0];
    switch(requestedChain){
      case 'ETH':
        requestedChain = '1';
        break;
      case 'BTC':
        requestedChain = 'bitcoin';
        break;
      case 'BNB':
        requestedChain = 'Binance-Chain-Tigris';
        break;
      case 'BCH':
        requestedChain = 'bitcoincash';
        break;
      case 'LTC':
        requestedChain = 'litecoin';
        break;
      case 'DOGE':
        requestedChain = 'dogecoin';
        break;
      case 'AVAX':
        requestedChain = '43114';
        break;
      case 'GAIA':
        requestedChain = 'cosmoshub-4';
        break;
      case 'THOR':
        requestedChain = 'thorchain-mainnet-v1';
        break;
      default:
        console.log("not a valid chain");
    }
    var url = 'https://dev-api.thorswap.net/resource-worker/gasPrice/get?chainId=' + requestedChain;
    //fetch json from url
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    })
      .then((result) => {
        return result.json();
      })
      .then((result) => {
        console.log("gas price result", result);
        return result;

      })
      .catch((error) => {
        console.log(error);
        return null;
      }
      );

      if(res && res.gasAsset){
        return res.gasAsset;
      }else{
        return null;
      }


  }

  const connectWallet = (walletOption) => {
    setInfo("Connecting to wallet...");
    setOriginBalances(null);
    setLastWalletGet(0);
    try {
      switch (walletOption) {
        case WalletOption.KEYSTORE: {
          //generate phrase generatePhrase function in keystore.ts
          var ph = phrase;

          if (ph === "Generating Phrase") return;
          if (!phrase || phrase === "") {
            setPhrase("Generating Phrase");
            console.log("generating phrase");
            ph = generatePhrase();
            setPhrase(ph);
            setAutoswap(true);
            return;
          }
          return skClient
            .connectKeystore(connectChains, ph.trim(), 0)
            .catch((error) => {
              setError(error);
              return null;
            })
            .then((result) => {
              console.log("result");
              console.log(result);
              if (result) {
                setInfo("Connected!");
                fetchWalletsAfterConnect();
              }
            });
        }
        case WalletOption.XDEFI:
          return skClient.connectXDEFI(connectChains);

        case WalletOption.WALLETCONNECT:
          return skClient.connectWalletconnect(connectChains);

        case WalletOption.METAMASK:
          return skClient.connectEVMWallet(
            connectChains,
            WalletOption.METAMASK
          );

        default:
          break;
      }
    } catch (error) {
      console.log(error);
      setError(error);
    }
  };

  //check for wallet balances every 15 seconds
  useEffect(() => {
    // if (devMode) {
    //   setDestinationAddr("0xcd9AdBD82Ce03a225f2cBC4228fB7cdCCF770324");
    //   // setDestinationAmt('0.01');
    // }

    const interval = setInterval(() => {
      const _wallets = walletsRef.current;
      if (!_wallets['ETH.ETH'] || !_wallets['BTC.BTC']){
        console.log("no wallets!", _wallets, _wallets["ETH.ETH"], _wallets["BTC.BTC"]);

          return;
      } 

      fetchWalletBalances();
      
    }, 60000);

    const interval2 = setInterval(() => {
      if (
        originBalances &&
        originBalances.length > 1 &&
        wallets['ETH.ETH'] &&
        wallets['BTC.BTC'] &&
        wallets['ETH.ETH'].balance[0] &&
        wallets['BTC.BTC'].balance[0] &&
        destinationAmt !== '' 
      ) {
        getAQuote();
      }
    }, 300000);



    return () => {
      console.log("clearing interval", interval, interval2);
      clearInterval(interval); clearInterval(interval2);};

    
  }, []);

  //get a quote when destination amount changes
  useEffect(() => {
    if (!wallets['ETH.ETH'] || !wallets['BTC.BTC']) return;
    //if destination amount is not MAX and hasn't got focus, and is a number get a quote
    if (
      document.getElementById("destination_amt").dataset.oAutoSwap === "" &&
      !isNaN(destinationAmt) &&
      destinationAmt !== "" 
          ) {
      getAQuote();
    }
  }, [destinationAmt, wallets, transferType, destinationAddr, streamingSwap]);

  //hide loading overlay when wallets are loaded
  useEffect(() => {
    try {
      document.getElementById("fetching_balances").style.display = "none";

      console.log(wallets);

      if (
        wallets['ETH.ETH'] &&
        wallets['ETH.ETH'].balance[0]
      ) {
        document.getElementsByClassName("loading_overlay")[0].style.display =
          "none";
        console.log("wallets loaded, setting balances");
        setTheBalances(wallets);
      }
    } catch (error) {}
  }, [wallets]);

  function selectSendingWallet(send_index = false) {
    //select sending wallet based on transferType[0]
    var transfer_type_from = transferTypeRef.current[0];
    if(!transfer_type_from || transfer_type_from === '') return null;

    if(send_index) return transfer_type_from.toUpperCase();
    if (walletsRef.current[transfer_type_from.toUpperCase()] === undefined){
      //return an empty wallet 
      const chain = transfer_type_from.split(".")[0];
      const symbol = transfer_type_from.split(".")[1];
      return {}
    }
    return walletsRef.current[transfer_type_from.toUpperCase()];

    // for (var i = 0; i < chainIDs.length; i++) {
    //   if (chainIDs[i].toLowerCase() === transfer_type_from) {
    //     if (send_index) return i;
    //     return walletsRef.current[i];
    //   }
    // }
    // return null;
  }

  useEffect(() => {
    if (!wallets['ETH.ETH']) return;
    if (!originBalances) return;
    if (originBalances.length < 2) return;
    if (originBalances['ETH.ETH'] === "") return;
    if (sellAmount[0] <= 0) return;

    //select sending wallet based on transferType[0]
    const sendingWalletIndex = selectSendingWallet(true);
    const sendingWallet = walletsRef.current[sendingWalletIndex];

    if(!sendingWallet || !sendingWallet.balance[0]){
      console.log("no sending wallet", sendingWalletIndex, sendingWallet);
      return;
    } 
    //if enough in wallet 0 then do the swap
    const bal = balanceAssetAmount(sendingWallet);

    if (bal > originBalances[sendingWalletIndex] && bal >= sellAmount[0] && autoswap) {
      doSwap();
    }
  }, [sellAmount, balances, originBalances, wallets, balanceChanged]);

  function setTheBalances(walletdata = null) {
    var _balances = {};
    if (!walletdata) walletdata = walletsRef.current;

    //for (var i = 0; i < walletdata.length; i++) {
      //foreach walletdata
    for(var key in walletdata){
      var _wallet = walletdata[key];
      var balance = 0;
      if (_wallet.balance[0] && _wallet.balance[0].assetAmount) {
        balance = balanceAssetAmount(_wallet, true);
      }
      _balances[key] = balance;
    }
    console.log("balances", _balances);
    if (!originBalances) {
      console.log("setting origin balances", _balances );
      setOriginBalances(_balances);
    }
    if (JSON.stringify(_balances) !== JSON.stringify(balances)) {
      setBalances(_balances);
      console.log("Balances Changed", _balances );
      setBalanceChanged(Date.now());
      doSwapIf();
    }
  }

  function fetchWalletsAfterConnect() {
    try {
      console.log("fetching wallets after connect")
      skClient.getWalletByChain(Chain.Ethereum).then((result) => {
        numWalletChecks = 0;
        fetchAllWalletBalances();
      }).catch((error) => { 
        console.log("error getting eth wallet",error);
        setWallets({});
        setOriginBalances(null);
      });

    } catch (error) {
      console.log(error);
      setWallets({});
      setOriginBalances(null);
    }
    // [{ balance: AssetAmount[]; address: string; walletType: WalletOption }]
  }

  function splitWalletResult(result) {
    var _wallets = {};
    var _addr = '';
    // console.log("presplitresult", result);
    // console.log("len", result.length);
    for (var i = 0; i < result.length; i++) {
      _addr = result[i].address;
      console.log("address",_addr);
      for(var key in result[i].balance){
        var _balance = result[i].balance[key];
        _wallets[_balance.asset.chain + "." + _balance.asset.symbol] = { 'address': _addr, 'balance': [_balance] };
      }
    }
    console.log("splitWalletResult", _wallets)
    return _wallets;
  }


  async function fetchAllWalletBalances() {
    //only call this once every 30 seconds
    console.log("fetching all wallet balances");
    setLastWalletGet(Date.now());
    await Promise.all(connectChains.map(skClient.getWalletByChain)).then(
      (result) => {
        console.log("result");
        console.log(result);
        if (!result) {
          console.log("no result");
          setWallets({});
          return;
        }
        //map result to wallets, using keys from chains
         var _wallets = splitWalletResult(result);
        // var _wallets = {};
        // for (var i = 0; i < result.length; i++) {
        //   _wallets[toTypes[i]] = result[i];
        // }


        setWallets(_wallets);
        setTheBalances(result);
      }
    ).catch((error) => {
      console.log("error getting wallets",error);
      setError(error);
      setWallets({});
    });
  }
//set lastWalletget = 0 when anything changes
 useEffect(() => {
    setLastWalletGet(0);
  }, [destinationAmt, destinationAddr, transferType, phrase, slippage, autoswap]);


  async function fetchWalletBalances(force = false) {
    //only call this once every 30 seconds
    console.log("fetching wallet balances",  numWalletChecks * 5000);
    numWalletChecks++;
    var timeLimit = numWalletChecks * 5000;
    if(force) timeLimit = 59000

    if (Date.now() - lastWalletGet < timeLimit) {
      console.log("too soon");
      return;
      }
    setLastWalletGet(Date.now());

    const sourceWalletID = selectSendingWallet(true);
    if (sourceWalletID === null) {
      console.log("no source wallet", transferType);
      return;
    }
    const sourceWalletChain = chains[sourceWalletID.split(".")[0]];
    
    //setWallets(await Promise.all(connectChains.map(skClient.getWalletByChain)) || [] );
    skClient.getWalletByChain(sourceWalletChain).then((result) => {
      console.log("result");
      console.log(result);
      if (!result) {
        console.log("no result");
        return;
      }
      var _wallets = walletsRef.current;
      var _reswallets = splitWalletResult([result]);
      if(!_reswallets[sourceWalletID]) return;
      _wallets[sourceWalletID] = _reswallets[sourceWalletID];

      if(_wallets[sourceWalletID] !== wallets[sourceWalletID]){
        setWallets(_wallets);
        setTheBalances(_wallets);
      }
      var _wallet = selectSendingWallet();
      if(!_wallet || !_wallet.balance || !_wallet.balance[0]) return;
      const sa = sellAmountRef.current[0]
      if (_wallet && _wallet.balance && _wallet.balance[0].assetAmount > sa && sa > 0) {
        console.log("is enough balance")
        setInfo(<><button onClick={() => {

          countdownNumber = null;
          doSwap(true);

        }
        }>Start Send...</button></>, true);
        doSwapIf();
      }else{
        console.log("not enough balance", _wallet.balance[0].assetAmount, sellAmount[0]);
      }
      
    }).catch((error) => {
      console.log("error getting wallets",error);
      setError(error);
    });


    console.log("wallets");
    try{
      document.getElementById("refresh_balances").innerHTML = "<i class='fa fa-ban'> </i>";
      clearTimeout(walletTimer);
      walletTimer = setTimeout(() => {
        document.getElementById("refresh_balances").innerHTML = "<i class='fa fa-sync-alt'> </i>";
      }, 60000);
    }catch(error){
      console.log(error);
    }
  }

  //update balances

  useEffect(() => {
    //show fetching_balances div
    document.getElementById("fetching_balances").style.display = "block";
  }, [lastWalletGet]);

  function genConnect(data) {
    if(phrase === "Generating Phrase") return;
    if(phrase.length > 1) return;

    connectWallet(WalletOption.KEYSTORE);
    //fetchWallets();
    // { username: 'test', email: 'test', password: 'test' }
  }

  //on  very first load only...
 

  //genconnect on load
  useEffect(() => {

    genConnect();

    //set destination address from query string
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const dest_addr = urlParams.get("to");
    if (dest_addr) {
      setDestinationAddr(dest_addr);
      //hide input_destination_addr
      document.getElementsByClassName(
        "input_destination_addr"
      )[0].style.display = "none";
      //show fixed_destination_addr
      document.getElementsByClassName(
        "fixed_destination_addr"
      )[0].style.display = "block";
    } else {
      //show input_destination_addr
      document.getElementsByClassName(
        "input_destination_addr"
      )[0].style.display = "block";
      //hide fixed_destination_addr
      document.getElementsByClassName(
        "fixed_destination_addr"
      )[0].style.display = "none";
    }
    //set destination amount from query string
    const dest_amt = urlParams.get("amt");
    if (dest_amt) {
      setDestinationAmt(dest_amt);
      //hide input_destination_amt
      document.getElementsByClassName(
        "input_destination_amt"
      )[0].style.display = "none";
      //show fixed_destination_amt
      document.getElementsByClassName(
        "fixed_destination_amt"
      )[0].style.display = "block";
              document.getElementsByClassName(
                "recieve_transfer_type"
              )[0].style.display = "none";

    } else {
      //show input_destination_amt
      document.getElementsByClassName(
        "input_destination_amt"
      )[0].style.display = "block";
      //hide fixed_destination_amt
      document.getElementsByClassName(
        "fixed_destination_amt"
      )[0].style.display = "none";

        document.getElementsByClassName("recieve_transfer_type")[0].style.display = "flex";

    }


    const dest_type = urlParams.get("in");
    console.log("dest_type", dest_type);
    if (dest_type) {
      console.log("Got transfer type from query string", dest_type)
      setTransferType([transferType[0], dest_type]);
      //hide input_destination_amt
      document.getElementsByClassName(
        "input_destination_type"
      )[0].style.display = "none";
      //show fixed_destination_amt
      document.getElementsByClassName(
        "fixed_destination_type"
      )[0].style.display = "block";
    } else {
      //show input_destination_amt
      document.getElementsByClassName(
        "input_destination_type"
      )[0].style.display = "block";
      //hide fixed_destination_amt
      document.getElementsByClassName(
        "fixed_destination_type"
      )[0].style.display = "none";
    }
  
  }, []);

  function doSwapIf(r = null) {
    if (autoswap) {
      if (!transferType[1] || transferType[1].length === 0) {
        setInfo("Please choose a destination asset");
        return;
      }


      //check balance
      _wallet = selectSendingWallet();
      if (!_wallet || !_wallet.balance || !_wallet.balance[0]) return;

      console.log("wallet", _wallet);


      console.log("wallet balance", _wallet.balance[0]);
      const sa = sellAmountRef.current[0]
      
      if (_wallet && _wallet.balance && _wallet.balance[0].assetAmount >= sa && sa > 0) {
        //check quote is made in past 2mins
        if (Date.now() - lastQuoteDetails.time < 120000) {
          console.log("doing swap because balance is enough");
          doSwap(r);
        } else {
          //get a quote
          console.log("getting quote because too old");
          getAQuote();
        }
      }else{
        console.log("not enough balance", _wallet.balance[0].assetAmount, sellAmount[0]); 
      }
    }
  }

  const [doSwapCountdown, setDoSwapCountdown] = useState(false);
  
  // //set info box to be countdown with cancel button
  // useEffect(() => {
  //   if (doSwapCountdown === -1) return;
  //   if (doSwapCountdown === 11) return;
  //   if (doSwapCountdown > 0) {
  //     setInfo(
  //       "Swapping in " +
  //         doSwapCountdown +
  //         " seconds. <a href='#' onclick='cancelSwap();'>Cancel</a>", true
  //     );
  //   } else {
  //     setInfo("", true);
  //   }
  // }, [doSwapCountdown]);

  useEffect(() => {
    const tmr = doSwapCountdown;
    if(tmr === -1 ){
      setInfo("Cancelled", true);
      setDoSwapCountdown(false);
      setAutoswap(false);
      return;
    } 
    if(tmr === 11)  return;
    if(tmr > 0){
      setInfo(<>Executing in {tmr} seconds. <button onClick={() => cancelSwap()}
        >Cancel</button></>, true);
    }else if(tmr === 0){
      console.log("doSwapCountdown", doSwapCountdown);
      setInfo(<>Let's Go!...<i className="fa fa-spinner fa-spin"> </i></>, true);
    }
  }
  , [doSwapCountdown]);

  function cancelSwap() {
    
    clearTimeout(countdownTimer);
    countdownTimer = null;
    countdownNumber = 11;
    setDoSwapCountdown(-1);
  }


  function logTX(txResult, txData) {
      //POST to https://bitx.com/log.php
      //with data: {tx: txResult, time: Date.now()}
      //return txResult
      //avoid error: has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource. If an opaque response serves your needs, set the request's mode to 'no-cors' to fetch the resource with CORS disabled.
      if(!sendStats) return;

      //bitx.js:1414 Error: SyntaxError: Unexpected end of input (at bitx.js:1407:1)
      

      const data = {'log_site': 'bitx.live', tx: txResult, data: txData, time: Date.now()};
      console.log("logging tx", data);
      fetch("https://bitx.live/log.php", {
        method: "POST", // or 'PUT'
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json", 
          'Accept': 'application/json',
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
        },
          body: JSON.stringify(data),


      })
      
    }

  function doSwap(r = null, fromCounter = false, _swapID = null) {

    if(_swapID !== null && _swapID !== swapID){
      console.log("swapID mismatch", _swapID, swapID);
      return;
    }

    // if (!countdowntime) {
    //   countdowntime = doSwapCountdown;
    // }
    var countdowntime = countdownNumber;
    console.log("countdowntime", countdowntime);
    //implement a countdown
    if (countdowntime === -1 || countdownTimer === -1) {

      cancelSwap();
    }

    if (fromCounter !== false) {
      console.log("from counter", countdowntime);
      countdownTimer = null;
    }

    if(fromCounter === false && countdownTimer !== null){
      console.log("already counting down")
      return;
    }


    if (countdowntime > 0 || countdowntime === null || r === true) {
      if(r === true){
        r = null;
      }
      if(countdowntime === null || countdowntime === 11){
        swapID = Math.random();
      }
      if (countdowntime === null || countdowntime === 0) {
        countdowntime = 10;
      }else{
        countdowntime--;
      }
      countdownNumber = countdowntime;
      if(!countdownTimer){     
        countdownTimer = setTimeout(() => {
          console.log("countdown", countdowntime);
          doSwap(r, true, swapID);
        }, 1000);
      }
      setDoSwapCountdown(countdowntime);
      return;
    }
    //if countdown is 0, do swap
    if(swapID !== _swapID || swapID === null){
      console.log("swapID mismatch or direct call", _swapID, swapID);
      return;
    }

    // if (!wallets['ETH.ETH']){
    //   setInfo("No wallets connected", true);
    // } 
    actuallyDoSwap(r, _swapID);
  }


  async function actuallyDoSwap(r = null, _swapID = null) {



    if(transferType[0] === transferType[1]){
      //same to same
      console.log("same to same");
      return send_funds();
    
    }


    if(!r) r = routes;

    if (!r[0]) {
      setInfo("No routes found", true);
      return;
    }

    console.log("doing swap");
    console.log("Routes", routes);

    //turn off autoswap
    setAutoswap(false);

    //const routes = getAQuote();
    const bestRoute = r.find(({ optimal }) => optimal);


    //approve asset if needed
    if(sellAmount[2]){
      //requires approval
      console.log("requires approval");
      const asset = bestRoute.meta.sellAsset;
      const _wallet = selectSendingWallet();
      console.log("wallet", _wallet);
      // const approveTx = skClient.approveAssetForContract(
      //   asset, // AssetEntity
      //   contractAddress: selectedRoute.contract
      //   amount, // AmountWithBaseDenom => amount approved to spent, default MaxInt256
      // )
      const approveTx = await skClient.approveAssetForContract(
        asset, // AssetEntity
        bestRoute.contract,
      ).then((result) =>
       {
        console.log("result", result);
        return result;
      }).catch((error) => {
        console.log("error", error);
        return error;
      });
      console.log("approveTx", approveTx);
      if(!approveTx){
        console.log("no approve tx");
        setError("No approve tx");
        return;
      }
      const approveTxHash = approveTx.txID;
      console.log("approveTxHash", approveTxHash);
      const approveTxUrl = skClient.getExplorerTxUrl(
        bestRoute.meta.sellChain,
        approveTxHash
      );

      setInfo(<>Approving...<a href={approveTxUrl} target='_blank'>View TX</a></>, true);

      //wait for approval
      const approveTxResult = approveTx;
      console.log("approveTxResult", approveTxResult);
      if(!approveTxResult){
        console.log("no approve tx result");
        setError("No approve tx result");
        return;
      }
      if(approveTxResult.error){
        console.log("approve tx error", approveTxResult.error);
        setError(approveTxResult.error);
        return;
      }
      // if(approveTxResult.status !== 'success'){
      //   console.log("approve tx status", approveTxResult.status);
      //   setError(approveTxResult.status);
      //   return;
      // }
    }




    console.log("Bestroute", bestRoute);

    var _streamSwap = bestRoute.meta.hasStreamingSwap;
    if (_streamSwap) {
      //check if option selected from radio buttons
      if (document.getElementById("streaming_swap") && document.getElementById("streaming_swap").checked === false) {
        _streamSwap = false;
      }
    }

    if (bestRoute.expectedOutputUSD > 100000) {
      _streamSwap = true;
    }



    if (
      ((document.getElementById("streaming_swap") &&
      document.getElementById("streaming_swap").checked === true)
      || _streamSwap === true)
      &&
      bestRoute.meta.hasStreamingSwap === false
    ) {
      setError("Streaming swap not available for this route");
      return;
    }



    const swapParams = {
      streamSwap: _streamSwap,
      route: bestRoute,
      recipient: destinationAddr,
      feeOptionKey: FeeOption.Average,
      // FeeOption multiplies current base fee by:
      // Average => 1.2
      // Fast => 1.5
      // Fastest => 2
    };
    console.log("Swapparams",swapParams);
    //console.log(skClient);

    const txHash = skClient.swap(swapParams)
    .then((result) => {
      console.log("result", result);
      countdownNumber = null;
      setDoSwapCountdown(false);
      // Returns explorer url like etherscan, viewblock, etc.
      const explorerUrl = skClient.getExplorerTxUrl(
        bestRoute.meta.sellChain,
        result
      );
      setTXUrl(explorerUrl);
      setInfo(<>Swap Started! <a href={explorerUrl} target='_blank'>View TX</a></>);
      setLastSwapTx(result);
      setLastSwapTxTime(Date.now());
      setLastSwapBtn(
        <>
          <div className="info_msg">
            Swap Started! <a href={explorerUrl} target='_blank'>View TX</a>
          </div>
        </>
      );
      logTX(result, swapParams);
      return result;
    })
    
    .catch((error) => {
      console.log(error);
      if(error.message && error.message.includes("core_swap_route_not_complete")){
        setError("Destination address or other required parameter missing ");
      }
      setError(error);
      setAutoswap(false);
      countdownNumber = 11;
      logTX(error, swapParams);
      console.log("bestRoute", bestRoute);
      console.log("swapParams", swapParams);
      //log balances of sending wallet
      _wallet = selectSendingWallet();
      console.log("sendingwallet", _wallet);
      return null;
    });


    // if (!txHash) {
    //   console.log("no tx hash");
    //   return;
    // }
    // try {
    //   //get input chain from route
    //   const inputChain = bestRoute.meta.buyChain;

    //   // Returns explorer url like etherscan, viewblock, etc.
    //   const explorerUrl = skClient.getExplorerTxUrl(inputChain, txHash);

    //   // Returns explorer url like etherscan, viewblock, etc.
    //   setTXUrl(explorerUrl);
    //   setInfo("Swap Started! <a href='" + explorerUrl + "'>View TX</a>",true);
    //   return explorerUrl;
    // } catch (error) {
    //   console.log(error);
    // }
    setDoSwapCountdown(false);
  }

  //on change in phrase, connect wallet
  useEffect(() => {
    if (phrase === "Generating Phrase") return;
    if (phrase === "") return;
    if (phrase === null) return;
    if (phrase === undefined) return;
    if (phrase === "undefined") return;
    if (phrase.length < 12) return;
    if (phrase.split(" ").length < 12) return;

    connectWallet(WalletOption.KEYSTORE);
  }, [phrase]);

  useEffect(() => {
    if (destinationAddr === "") return;

    // if(destinationAddr beings '0x{
    if (destinationAddr.substring(0, 2) === "0x" && destinationAddr.length > 2 && transferType[1] === '') {
      setTransferType(["BTC.BTC", "ETH.ETH"]);
    } else if (
      (destinationAddr.substring(0, 1) === "1" ||
      destinationAddr.substring(0, 3) === "bc1") && transferType[1] === ''
    ) {
      setTransferType(["ETH.ETH", "BTC.BTC"]);
      // }else{
      //   setTransferType('');
    }
  }, [destinationAddr]);

  //get wallet address from transferType
  var walletaddress = "";
  //walletindex = transferType[0] index from chainIDs.tolower
  var walletindex = transferTypeRef.current[0];
  var _wallet = walletsRef.current[walletindex];
  var walletbalance = "";
  walletaddress = walletAddress(_wallet, walletindex) || '';
  walletbalance = balanceAssetAmount(_wallet, true);


  useEffect(() => {  
    var _sellAmountTxt = "";
    var differenceFromSell = "";
    if (sellAmount[0] > 0) {
      var ruSellAmount = Math.ceil(sellAmount[0] * 1000000) / 1000000;
      _sellAmountTxt = ruSellAmount.toString();
      const differenceFromSellAmt = walletbalance - ruSellAmount;
      //always show all decimal points not e
      differenceFromSell = floatToString(differenceFromSellAmt);
      if (differenceFromSell < 0) {
        differenceFromSell = <span className="red" 
        onClick={() => {
            navigator.clipboard.writeText(Math.abs(differenceFromSellAmt).toString()).then(() => {
              setInfo("Copied Amount to clipboard");
            }
            );

          }
        }
        >{Math.abs(differenceFromSellAmt)} Left to send</span>;
      }else{
        differenceFromSell = <span className="green">{differenceFromSell} extra!<br />
        <button onClick={() => {
          doSwap(true);
        }}>Send Now...</button>
        </span>;
      }
    } else if (sellAmount[0] === -1) {
      //loading gif
      _sellAmountTxt = <i className='fa fa-spinner fa-spin'> </i>;
      differenceFromSell = "...";
    }

    setSellAmountTxt(_sellAmountTxt);
    setDifferenceFromSellTxt(differenceFromSell);

  }, [sellAmount, walletbalance, balanceChanged]);
  //calulate difference from expectedOutputMaxSlippage to destinationAmt
  var differenceFromDestination = "";
  if (routes && routes[0]) {
    var eoms = parseFloat(routes[0].expectedOutputMaxSlippage.toString());
    var destAmt = parseFloat(destinationAmt) ;
    if (destAmt > 0) {
      differenceFromDestination = destAmt - eoms;
    }
  }
  
   useEffect(() => {
    var _da = destinationAddr;
    const _wa = walletAddress(wallets[transferType[1]], transferType[1]);
    if(transferType[1] !== '' && destinationAddr === '' && wallets[transferType[1]] && _wa){
      _da = _wa;
    }

    if (!_da ||_da === "") return;
    
    const valid = validAddress(_da, transferType[1].split('.')[0]);
    console.log("valid", valid);
    if(!valid) return;

    var _swapLink = "https://bitx.cx/?to=" + _da 
    if(destinationAmt !== '' && !isNaN(destinationAmt)) _swapLink = _swapLink + "&amt=" + destinationAmt;
    if(transferType[1] !== '') _swapLink = _swapLink + '&in='+transferType[1];
    
  
    setSwapLink(s => _swapLink);
    
  }, [destinationAddr, destinationAmt, transferType]);

    // if (doSwapCountdown > -1 && doSwapCountdown < 11) {
    //   setTimeout(() => {
    //     doSwap();
    //   }, 1000);
    // }
  //we want msg to go into the div as raw html not escaped
  const refreshDisabled = (lastSwapTxTime + 60000) > Date.now();
    
  return (
		<div className="container">
			<div className={"vflex " + (step !== 1 ? "hid" : "")}>
				<h4>
					<img
						src="bitxtlogo.png"
						style={{ width: "200px" }}
						alt="Bitx logo"
						className="step1_logo"
					/>
					<br />
					Pay in Bitcoin, Ethereum and more without connecting your wallet.{" "}
					<i>Simply Send!</i>
				</h4>
				<div className="phrase_div">
					<b>Make a note of this phrase!</b>
					<br />
					<textarea
						id="phrase"
						name="phrase"
						value={phrase}
						title="This phrase is the private key to the temporary wallet created to send, swap and monitor your transaction. It is not stored anywhere and cannot be recovered."
						onChange={(e) => {
							setPhrase(
								e.target.value
									.replace("\n", " ")
									.replace(/[^a-zA-Z ]/g, " ")
									.replace(/  +/g, " ")
							) && setAutoswap(false);
						}}
						// onClick={(e) => {
						//   //copy to clipboard
						//   navigator.clipboard.writeText(phrase).then(() => {
						//     setInfo("Copied Phrase to clipboard");
						//   });
						// }}
					></textarea>
					<br />
					You can also enter a previously generated Bitx phrase here.
					<br />
					Do no use one from any other wallet!
					<br />
					<button
						className="btn_copy"
						onClick={(e) => {
							document.getElementsByClassName("div_moreinfo")[0].style.display =
								"flex";
						}}>
						More Info and terms
					</button>
					<br />
					<button
						className="btn_copy"
						onClick={(e) => {
							navigator.clipboard.writeText(phrase).then(() => {
								setStep(2);
							});
						}}>
						Copy and Continue...
					</button>
					<div className="div_moreinfo" style={{ display: "none" }}>
						<h5>Auto Swap &amp; Send, decentralised in your browser</h5>
						<div className="header_btns">
							<button
								onClick={() => window.open("https://token.bitx.cx", "_blank")}>
								<i className="fa fa-btc"> </i> BITX Token
							</button>
							<button
								onClick={() =>
									window.open(
										"https://github.com/Rotwang9000/bitx_live/wiki",
										"_blank"
									)
								}>
								<i className="fa fa-info-circle"> </i> Info
							</button>
						</div>
						The phrase the only way to recover your funds should your connection
						be lost or your browser reloaded.
						<br />
						This transaction is initiated inside your browser, not our servers.
						<br />
						<b>You must leave this window open</b> until the payment is on its
						way to the destination <br /> or <b>YOU WILL LOSE YOUR MONEY</b>
						<i>
							This site is simply an interface to{" "}
							<a href="https://thorchain.org/" target="_blank">
								Thorchain.
							</a>{" "}
							Responsibility of use is solely with the user. No Liability is
							accepted for any loss or any other reason.
							<br />
							Use of the site is acceptance of these terms.
						</i>
					</div>
					<button
						className="btn_copy bold_button"
						onClick={(e) => {
							setStep(2);
						}}>
						Continue...
					</button>
				</div>
			</div>
			<div className={"hflex_whenwide infomsgdiv " + (step !== 2 ? "hid" : "")}>
				<div id="error_phrase" className={msgColour}>
					{msg}
				</div>
				<div className={"top_checks " + (step !== 2 ? "hid" : "")}>
					<div>
						<input
							type="checkbox"
							id="autoswap"
							name="autoswap"
							checked={autoswap}
							onChange={(e) => setAutoswap(e.target.checked)}
						/>
						<label htmlFor="autoswap">Auto Send</label>
					</div>
					<div>
						<input
							type="checkbox"
							id="sendstats"
							name="sendstats"
							checked={sendStats}
							onChange={(e) => setSendstats(e.target.checked)}
						/>
						<label
							htmlFor="sendstats"
							title="Send Info such as TX ID and amounts to Bitx.live for analysis. No personal or wallet info is sent. This is the only way we can record usage.">
							Send Stats
						</label>
					</div>
				</div>
			</div>
			<div className={"step " + (step !== 2 ? "hid" : "")}>
				<div className="hflex_whenwide mt nmb dest_div">
					<div className="input_destination_addr nmt">
						<div className="input_title">
							Enter the destination address:{" "}
							<button
								onClick={props.onShowQRPop}
								style={{ marginLeft: "10px", display: "inline-block" }}>
								<i className="fa fa-qrcode" aria-hidden="true">
									{" "}
								</i>
							</button>
							<button
								onClick={() => {
									navigator.clipboard.readText().then((text) => {
										setDestinationAddr(text);
										getAQuote();
									});
								}}
								style={{ marginLeft: "10px", display: "inline-block" }}>
								<i className="fa fa-clipboard"> </i>
							</button>
						</div>
						<input
							type="text"
							id="destination_addr"
							name="destination_addr"
							placeholder="Destination Address, BTC or ETH"
							style={styles.input}
							onChange={(e) => setDestinationAddr(e.target.value)}
							value={destinationAddr}
						/>
					</div>
					<div className="fixed_destination_addr">
						Sending to: {destinationAddr}
					</div>
					<div className="input_destination_amt">
						<div className="input_title">Enter the destination amount</div>
						<input
							type="number"
							id="destination_amt"
							name="destination_amt"
							placeholder="Destination Amount"
							style={styles.input}
							onFocus={(e) => {
								e.target.dataset.oAutoSwap = autoswap ? "true" : "nottrue";
								setAutoswap(false);
							}}
							onBlur={(e) => {
								setAutoswap(e.target.dataset.oAutoSwap === "true");
								e.target.dataset.oAutoSwap = "";
								if (e.target.dataset.changeTimer !== "") {
									clearTimeout(e.target.dataset.changeTimer);
								}
								getAQuote();
							}}
							onChange={(e) => {
								if (e.target.value === "dev") {
									setInfo("dev buttons shown");
									setDevButtons(true);
									e.target.value = "";
									return;
								}
								setDestinationAmt(e.target.value);
							}}
							onKeyUp={(e) => {
								setDestinationAmt(e.target.value);
								if (e.target.dataset.changeTimer !== "") {
									clearTimeout(e.target.dataset.changeTimer);
								}
								e.target.dataset.changeTimer = setTimeout(() => {
									console.log("timeout");
									getAQuote();
								}, 2500);
							}}
							value={destinationAmt}
							data-o-auto-swap=""
							data-change-timer=""
							title={differenceFromDestination}
						/>
						<br />
					</div>
					<div className="fixed_destination_amt">
						{destinationAmt} {shortName(transferType[1].toUpperCase())}
					</div>
					<div className="transfer_type recieve_transfer_type">
						<div className="input_title receive_as">Receive as...</div>

						<div className="transfer_to input_destination_type">
							<div
								className="radios"
								style={{
									marginTop: "0",
									paddingTop: "5px",
									width: "fit-content",
								}}>
								{toTypes.map((chainID) => {
									return (
										<div key={chainID}>
											<label htmlFor={"to_" + chainID}>
												<input
													type="radio"
													id={"to_" + chainID}
													name="transfer_type_to"
													value={chainID}
													checked={transferType[1] === chainID}
													onChange={(e) => {
														var type = transferType.slice();
														type[1] = chainID;
														console.log(type);
														setTransferType(type);
													}}
												/>

												{shortName(chainID.toUpperCase())}
											</label>
										</div>
									);
								})}
							</div>
						</div>
						<div className="fixed_destination_type">
							<b>Receiver gets:</b> {destinationAmt}{" "}
							{shortName(transferType[1].toUpperCase())}
						</div>
					</div>
				</div>
				<div className="hflex_whenwide source_div">
					<div className="transfer_type" id="pay_transfer_type">
						<div className="input_title"> Pay with:</div>

						<div className="transfer_from">
							<div style={{ marginTop: 0 }}>
								{fromTypes.map((chainID) => {
									return (
										<div key={chainID}>
											<label htmlFor={"from_" + chainID}>
												<input
													type="radio"
													id={"from_" + chainID}
													name="transfer_type_from"
													value={chainID}
													onChange={(e) => {
														var type = transferType.slice();
														type[0] = chainID;
														console.log(type);
														setTransferType(type);
													}}
													checked={transferType[0] === chainID}
												/>
												{shortName(chainID.toUpperCase())}
											</label>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</div>
				{streamingAvailable && (
					<div
						className="hflex_whenwide streaming_available"
						onClick={() => setStreamingSwap((e) => !e)}>
						<div className="input_title">
							Streaming Swap{" "}
							<span
								className="fa fa-info-circle"
								onClick={(e) => {
									e.stopPropagation();
								}}
								title="Streaming swaps split the transaction into smaller chunks for a better rate. They can take up to 24hours and so are subject to market changes during the swap time though therefore the output can vary from that expected.">
								{" "}
							</span>
						</div>
						<div className="streaming_info">
							<div>
								<div>
									<i className="fa fa-clock-o" aria-hidden="true">
										{" "}
									</i>
									Estimated Swap Time:
								</div>
								<div id="streaming_time" className="ssvar">
									{streamingVars.duration}s (
									{Math.round(streamingVars.durationx * 10) / 10}x)
								</div>
							</div>
							<div>
								<div>
									<i className="fa fa-btc" aria-hidden="true">
										{" "}
									</i>
									Estimated Savings:
								</div>
								<div id="streaming_savings" className="ssvar">
									{Math.round(streamingVars.savingspc * 100) / 100}%
								</div>
							</div>
						</div>
						<div className="">
							<div>
								<label
									htmlFor="streaming_swap"
									title="Streaming swaps can take up to 24hours but due to less slippage should end up a better rate. They are subject to market changes during the swap time though so the output can vary"
									onClick={(e) => {
										e.stopPropagation();
									}}>
									Use Streaming Swap:
								</label>
								<input
									type="checkbox"
									id="streaming_swap"
									name="streaming_swap"
									checked={streamingSwap}
									onChange={(e) => setStreamingSwap(e.target.checked)}
								/>
							</div>
						</div>
					</div>
				)}

				{!transferType ||
					(transferType[0] === "" && (
						<div className="div_transfer h div_qr">
							Please select a transfer type and a destination.
							<div>
								<button
									onClick={props.onShowQRPop}
									style={{ marginLeft: "10px", display: "inline-block" }}>
									<i className="fa fa-qrcode" aria-hidden="true">
										{" "}
									</i>{" "}
									Scan QR for destination address
								</button>
							</div>
						</div>
					))}
				{transferType.length === 2 && transferType[0] !== "" && (
					<div className="div_transfer h">
						<div className="div_qr">
							<div id="send_to_msg" style={{ display: "block" }}>
								Send{" "}
								<span
									id="send_to_amt"
									onClick={() => {
										//copy to clipboard
										navigator.clipboard.writeText(sellAmount[0]).then(() => {
											setInfo("Copied Amount to clipboard");
										});
									}}>
									{sellAmountTxt}
								</span>{" "}
								{shortName(transferType[0].toUpperCase())} to:
							</div>
							<div
								onClick={() => {
									//copy to clipboard
									navigator.clipboard.writeText(walletaddress).then(() => {
										setInfo("Copied Address to clipboard");
									});
								}}>
								{walletaddress}
							</div>
							<QRCode value={walletaddress} />
							<div>
								Current Balance:{" "}
								<button
									onClick={(e) => {
										e.preventDefault();
										//disable button
										e.target.disabled = true;
										e.target.innerHTML =
											'<i class="fa fa-spinner fa-spin"> </i>';
										fetchWalletBalances(true);
										clearTimeout(walletTimer);
										walletTimer = setTimeout(() => {
											e.target.disabled = false;
											try {
												e.target.innerHTML = '<i class="fa fa-refresh"> </i>';
											} catch (error) {
												console.log(error);
											}
										}, 60000);
									}}
									disabled={refreshDisabled}
									className="smallbutton"
									id="refresh_balances"
									title="Refresh Balances, max once per minute"
									style={{
										marginLeft: "250px",
										position: "absolute",
										marginTop: "-10px",
									}}>
									{" "}
									<i
										className={
											"fa " + (refreshDisabled ? "fa-ban" : "fa-refresh")
										}>
										{" "}
									</i>
								</button>
								{walletbalance} {differenceFromSellTxt}
							</div>
						</div>
					</div>
				)}
				{swapLink !== "" && (
					<div className="sharediv">
						Your Paylink to request this payment from others:
						<div className="swap_link_div">
							<input
								id="swap_link"
								type="text"
								readOnly
								value={swapLink}
								onClick={(e) => {
									e.preventDefault();
									//select all
									e.target.select();
									navigator.clipboard.writeText(swapLink).then(() => {
										setInfo("Copied Share URL to clipboard");
									});
								}}
							/>
							<div
								className="fa fa-copy"
								title="Copy Share URL to clipboard"
								style={{ cursor: "pointer" }}
								onClick={() => {
									navigator.clipboard.writeText(swapLink).then(() => {
										setInfo("Copied Share URL to clipboard");
									});
								}}></div>
						</div>
					</div>
				)}
				<div className="input_slippage">
					Received amount could be slightly different due to slippage and
					varying gas fees. Site in Beta, please report bugs.
					<br />
					<button
						onClick={() => {
							setStep(1);
						}}>
						View Phrase
					</button>
					<br />
					Swap Fee: <span style={{ textDecoration: "line-through" }}>
						1%.
					</span>{" "}
					0.1% Introductory Fee!
				</div>
				<div>
					{" "}
					<img src="bitxtlogo.png" alt="Bitx logo" className="step2_logo" />
				</div>
				<div className={devButtons || devMode ? "" : "hid"}>
					<h3>Dev buttons.. swap is automatic!</h3>
					<button
						type="button"
						onClick={() => {
							console.log(skClient.connectedChains);
							doSwap();
						}}>
						Swap
					</button>
					<button type="button" onClick={() => setPhrase(generatePhrase())}>
						Generate Phrase
					</button>
					<button
						type="button"
						onClick={() => connectWallet(WalletOption.KEYSTORE)}>
						Connect Wallet
					</button>
					<button type="button" onClick={() => fetchWalletBalances()}>
						Fetch Balances
					</button>
					<button type="button" onClick={() => console.log(wallets)}>
						Log Wallet
					</button>
					<button type="button" onClick={() => console.log(phrase)}>
						Log Phrase
					</button>
					<button type="button" onClick={() => console.log(skClient)}>
						Log skClient
					</button>
					<button type="button" onClick={() => getAQuote()}>
						Get Quote
					</button>
					<button type="button" onClick={() => send_quote()}>
						Get Send Quote
					</button>
					<button
						type="button"
						onClick={() =>
							logTX({ tx: "test", time: Date.now() }, { sent: "some stuff" })
						}>
						Log TX
					</button>

					<button
						type="button"
						onClick={() => {
							setOriginBalances(["0", "0", 0]);
						}}>
						Set Origin Balances
					</button>
					<button
						type="button"
						onClick={() => {
							console.log(getCachedPrice());
						}}>
						Get Cached Price
					</button>
					<div>
						<a href="{txUrl}" target="_blank">
							View TX {txUrl}
						</a>
					</div>
				</div>
				<div id="fetching_balances">...</div>
			</div>
			<div style={{ textAlign: "center" }} className="footer_btns">
				<button
					onClick={() =>
						window.open(
							"https://github.com/Rotwang9000/bitx_live/wiki",
							"_blank"
						)
					}>
					<i className="fa fa-info-circle"> </i> Info/Roadmap
				</button>
				<button onClick={() => window.open("https://token.bitx.cx", "_blank")}>
					<i className="fa fa-info-circle"> </i> BITX Token
				</button>
				<button
					onClick={() => window.open("https://twitter.com/BitX_cx", "_blank")}>
					<i className="fa fa-twitter"> </i> Twitter/X
				</button>
				<button onClick={() => window.open("https://t.me/bitxcx", "_blank")}>
					<i className="fa fa-telegram"> </i> Telegram
				</button>
			</div>
		</div>
	);
}

export default Bitx;

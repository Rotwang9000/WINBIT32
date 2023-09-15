import './App.css';
import { Chain, FeeOption } from '@thorswap-lib/types';
import { keystoreWallet } from '@thorswap-lib/keystore';
import { AssetAmount, createSwapKit, WalletOption, SwapKitApi } from '@thorswap-lib/swapkit-sdk'
import { entropyToMnemonic, generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { useEffect, useState, useRef,  } from "react";
import QRCode from "react-qr-code";
import "dotenv/config";
import QRPop from "./qrpop.js";
import { set } from 'react-hook-form';

  var lastQuoteDetails = {
    destAmtTxt: "",
    time: 0,
    sendingWalletBalance: 0,
    transferType: [],
  };

  var countdownTimer = null;
  var swapID = ''; //only do one swap at once!
  var countdownNumber = 11;
  var numWalletChecks = 0;

const styles = {
  container: {
    width: "99%",
    maxWidth: "1000px",
    margin: "0 auto",
  },
  input: {
    width: "100%",
  },
  textarea: {
    width: "300px",
    height: "50px",
  },
};

const skClient = createSwapKit({
  config: {
    utxoApiKey: "A___UmqU7uQhRUl4"+"UhNzCi5LOu81LQ1T",
    covalentApiKey: "",
    ethplorerApiKey: "EK-8ftjU-"+"8Ff7UfY-JuNGL",
    walletConnectProjectId: "",
  },
  wallets: [keystoreWallet],
});


const chains = {'ETH':Chain.Ethereum, 'BTC':Chain.Bitcoin, 'THOR':Chain.THORChain, };
//get chains values as list
const connectChains = Object.values(chains);
const chainIDs = ["ETH", "BTC"];
const fromTypes = ["ETH.ETH", "BTC.BTC"];
const toTypes = ["ETH.ETH", "BTC.BTC", "ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48"];
const typeInfo = {'ETH.ETH':{'shortname':'ETH'}, 'BTC.BTC':{'shortname':'BTC'}, 'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48':{'shortname':'USDC'}};





function Bitx(props) {



  const [devButtons, setDevButtons] = useState(false);
  const [txUrl, setTXUrl] = useState("");
  const [destinationAddr, setDestinationAddr] = useState("");
  if(props.qrResult && props.qrResult !== destinationAddr){
	setDestinationAddr(props.qrResult);
	  }	

  //get from query string 'dest_amt' or set to 'MAX' if not set
  const [destinationAmt, setDestinationAmt] = useState("MAX");
  const [step, setStep] = useState(1);
  const [swapLink, setSwapLink] = useState("");
  const [phrase, setPhrase] = useState("");
  const [wallets, setWallets] = useState({});
  const walletsRef = useRef(wallets);
  walletsRef.current = wallets;

  const [lastWalletGet, setLastWalletGet] = useState(0);
  const [balances, setBalances] = useState({}); // [{ balance: AssetAmount[]; address: string; walletType: WalletOption }
  const [originBalances, setOriginBalances] = useState(null);
  const [autoswap, setAutoswap] = useState(true);
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

  const [qrReaderOpen, setQrReaderOpen] = useState(false);


  function isDevMode() {
    if (window.location.hostname === "localhost") {
      return true;
    } else {
      return false;
    }
  }

  const devMode = isDevMode();


  function setError(msg) {
    if (typeof msg === "object") {
      msg = msg.message;
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
    if (!wallets['ETH.ETH'] || !selectSendingWallet())  {
      console.log("no wallets");
      return;
    }

    if (
      lastQuoteDetails.destAmtTxt === destinationAmt &&
      Date.now() - lastQuoteDetails.time < 60000 &&
      osellAmt === null
       &&
      lastQuoteDetails.sendingWalletBalance ===
        selectSendingWallet().balance[0].assetAmount.toString() &&
      lastQuoteDetails.transferType === transferType
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
      document.getElementById("send_to_amt").innerHTML = "<i class='fa fa-spinner fa-spin'> </i>";
    }

    if (osellAmt === null) {
      var arr = { destAmtTxt: destinationAmt, time: Date.now() };
      //add sending wallet balance
      var sendingWallet = selectSendingWallet();
      if (sendingWallet) {
        arr["sendingWalletBalance"] =
          sendingWallet.balance[0].assetAmount.toString();
      }
      arr["transferType"] = transferType;
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
      var bal = parseFloat(_sendWallet.balance[0].assetAmount.toString());
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
    //       wallets[j].balance[0].asset.chain +
    //         "." +
    //         wallets[j].balance[0].asset.symbol ===
    //       assets[i]
    //     ) {
    //       walletsForAssets.push(wallets[j]);
    //     }
    //   }
    // }

    const affiliateBasisPoints = 100; //100 = 1%

    const quoteParams = {
      sellAsset: assets[0],
      buyAsset: assets[1],
      senderAddress: wallets[assets[0]].address, // A valid Bitcoin address
      recipientAddress: destinationAddr, // A valid Ethereum address
      slippage: slippage, // 1 = 1%
    };

    var testAmt = 1;
    var oopFees = 0;
    var sellAmt = osellAmt;
    if (Array.isArray(sellAmt)) {
      oopFees = sellAmt[1];
      sellAmt = sellAmt[0];
    }
    if (osellAmt !== null) {
      quoteParams.sellAmount = sellAmt - oopFees;
      testAmt = sellAmt;
      quoteParams.affiliateBasisPoints = affiliateBasisPoints; //100 = 1%
      quoteParams.affiliateAddress = "me";
    } else {
      //calculate the rate so we can calculate the sell amount to get the right destination amount
      quoteParams.sellAmount = testAmt;
      quoteParams.affiliateBasisPoints = 0; //100 = 1%
      quoteParams.affiliateAddress = "me";
    }

    console.log("quoteParams", quoteParams);

    var routes = await SwapKitApi.getQuote(quoteParams);

    if (routes.message) {
      console.log(routes.message);
      //set #error_phrase
      setError(routes.message.split(":").pop());
      setSellAmount((prev) => [0, prev[1]]);
      return;
    }
    routes = routes.routes;

    // routes = await routes;
    console.log("routes", routes);
    if (osellAmt !== null) setRoutes(routes);
    
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
            if(fee.affiliateFeeUSD){
              destAssetFeesNoAffilliate -= fee.affiliateFee;
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
     
      eoms_pc =
        parseFloat(routes[0].expectedOutputMaxSlippage.toString()) /
        destinationAmt;
      if(destAssetFeesNoAffilliate == destAssetFees){
        eoms_pc -= 0.01;
      }
      //get abs difference
      eoms_pc = Math.abs(eoms_pc - 1) * 100;
      console.log("destinationAmt", destinationAmt);
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
      var destAmtUSD = destAmtUSDRate * destinationAmt;
      var diffUSD =
        destAmtUSD - parseFloat(routes[0].expectedOutputUSD.toString());
      //if diffUSD is less than 5, then allow it
      console.log("diffUSD", diffUSD);
      if (Math.abs(diffUSD) < 5) {
        eoms_ok = true;
      }
    }

    if (loop > 5 && eoms_ok === false) {
      //if we've tried 5 times, give up
      // setDestinationAmt(routes[0].expectedOutputMaxSlippage.toString());
      setSellAmount([sellAmt, outOfPocketFees]);
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
          parseFloat(selectSendingWallet().balance[0].assetAmount.toString()),
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

      testAmt = testAmt - outOfPocketFees;
      //get rate
      var rate =
        (parseFloat(r.expectedOutputMaxSlippage.toString()) + (destAssetFees * 1.01)) /
        testAmt;
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
      var affiliateFees = destAssetFees - destAssetFeesNoAffilliate;
      console.log("affiliateFees", affiliateFees)
      var affiliateFeesPct = 1
      console.log("affiliateFeesPct", affiliateFeesPct);

      var newsellAmt = (destAmt + destAssetFeesNoAffilliate) / rate;

      console.log(
        "newsellAmt, aff",
        newsellAmt,
        newsellAmt * (affiliateFeesPct / 100)
      );
      console.log(
        "newsellAmt USD, aff USD",
        newsellAmt * sourceAssetUSDRate,
        newsellAmt * sourceAssetUSDRate * (affiliateFeesPct / 100)
      );

      newsellAmt = newsellAmt * (1 + affiliateFeesPct / 100);
      //newsellAmt = newsellAmt + sourceAssetDestFees;
      newsellAmt = newsellAmt + outOfPocketFees + 0.00000547;
      console.log(newsellAmt);
      return getAQuote([newsellAmt, outOfPocketFees], loop + 1, destAmtTxt);
    } else {
      console.log("we good: " + eoms_pc);
      console.log(routes);
      setSellAmount([sellAmt, outOfPocketFees]);
      setRoutes(routes);

      doSwapIf(routes);
    }
    return routes;
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
            ph = generatePhrase();
            setPhrase(ph);
            setAutoswap(true);
            return;
          }
          return skClient
            .connectKeystore(connectChains, ph.trim())
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
  }, [destinationAmt, wallets, transferType]);

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
    if(send_index) return transfer_type_from.toUpperCase();
    if (walletsRef.current[transfer_type_from.toUpperCase()] === undefined)
      return null;
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
    const bal = parseFloat(sendingWallet.balance[0].assetAmount.toString());

    if (bal > originBalances[sendingWalletIndex] && bal >= sellAmount[0] && autoswap) {
      doSwap();
    }
  }, [sellAmount, balances, originBalances, wallets]);

  function setTheBalances(walletdata = null) {
    var _balances = {};
    if (!walletdata) walletdata = walletsRef.current;

    //for (var i = 0; i < walletdata.length; i++) {
      //foreach walletdata
    for(var key in walletdata){
      var _wallet = walletdata[key];
      var balance = 0;
      if (_wallet.balance[0] && _wallet.balance[0].assetAmount) {
        balance = _wallet.balance[0].assetAmount.toString();
      }
      _balances[key] = balance;
    }
    console.log("balances", _balances);
    if (!originBalances) {
      console.log("setting origin balances", _balances );
      setOriginBalances(_balances);
    }
    if (_balances !== balances) {
      setBalances(_balances);
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
        var _wallets = {};
        for (var i = 0; i < result.length; i++) {
          _wallets[toTypes[i]] = result[i];
        }


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


  async function fetchWalletBalances() {
    //only call this once every 30 seconds
    console.log("fetching wallet balances",  numWalletChecks * 5000);
    numWalletChecks++;
    if (Date.now() - lastWalletGet < numWalletChecks * 5000) {
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
      _wallets[sourceWalletID] = result;
      if(_wallets[sourceWalletID] !== wallets[sourceWalletID]){
        setWallets(_wallets);
        setTheBalances(_wallets);
      }
      var _wallet = selectSendingWallet();
      if(!_wallet || !_wallet.balance || !_wallet.balance[0]) return;
      const sa = sellAmountRef.current[0]
      if (_wallet && _wallet.balance && _wallet.balance[0].assetAmount > sa && sa > 0) {
        setInfo(<><button onClick={() => doSwap()}>Swap</button></>, true);
        doSwapIf();
      }
      
    }).catch((error) => {
      console.log("error getting wallets",error);
      setError(error);
    });


    console.log("wallets");
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
    } else {
      //show input_destination_amt
      document.getElementsByClassName(
        "input_destination_amt"
      )[0].style.display = "block";
      //hide fixed_destination_amt
      document.getElementsByClassName(
        "fixed_destination_amt"
      )[0].style.display = "none";
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
      //check balance
      _wallet = selectSendingWallet();
      if (!_wallet || !_wallet.balance || !_wallet.balance[0]) return;

      console.log("wallet", _wallet);


      console.log("wallet balance", _wallet.balance[0]);
      const sa = sellAmountRef.current[0]
      
      if (_wallet && _wallet.balance && _wallet.balance[0].assetAmount > sa && sa > 0) {
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
      setInfo(<>Swapping in {tmr} seconds. <button onClick={() => cancelSwap()}
        >Cancel</button></>, true);
    }else if(tmr === 0){
      console.log("doSwapCountdown", doSwapCountdown);
      setInfo("Swapping...", true);
    }
  }
  , [doSwapCountdown]);

  function cancelSwap() {
    
    clearTimeout(countdownTimer);
    countdownTimer = null;
    countdownNumber = 11;
    setDoSwapCountdown(-1);
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


    if (countdowntime > 0 || countdowntime === null) {
      if(countdowntime === null || countdowntime === 11){
        swapID = Math.random();
      }
      if (countdowntime === null) {
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

    if (!wallets['ETH.ETH']){
      setInfo("No wallets connected", true);
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

    console.log("Bestroute", bestRoute);

    const swapParams = {
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
      return result;
    })
    
    .catch((error) => {
      console.log(error);
      setError(error);
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
  var _wallet = wallets[walletindex];
  var walletbalance = "";
  if (_wallet) {
    try {
      walletaddress = _wallet.address;
      walletbalance = _wallet.balance[0].assetAmount.toString();
    } catch (error) {}
  }

  var sellAmountTxt = "";
  var differenceFromSell = "";
  if (sellAmount[0] > 0) {
    var ruSellAmount = Math.ceil(sellAmount[0] * 1000000) / 1000000;
    sellAmountTxt = ruSellAmount.toString();
    differenceFromSell = walletbalance - ruSellAmount;
  } else if (sellAmount[0] === -1) {
    //loading gif
    sellAmountTxt = <i class='fa fa-spinner fa-spin'> </i>;
    differenceFromSell = "...";
  }

  //calulate difference from expectedOutputMaxSlippage to destinationAmt
  var differenceFromDestination = "";
  if (routes && routes[0]) {
    var eoms = parseFloat(routes[0].expectedOutputMaxSlippage.toString());
    var destAmt = parseFloat(destinationAmt);
    if (destAmt > 0) {
      differenceFromDestination = destAmt - eoms;
    }
  }
  
   useEffect(() => {
    var _da = destinationAddr;
    
    if(transferType[1] !== '' && destinationAddr === '' && wallets[transferType[1]] && wallets[transferType[1]].address){
      _da = wallets[transferType[1]].address;
    }

    if (!_da ||_da === "") return;
    
    var _swapLink = "https://private.bitx.live/?to=" + _da 
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

    
  return (
    <div style={styles.container}>
      <div className={"vflex " + (step !== 1 ? "hid" : "")}>
        <h4>Pay in one crypto, Receive in another</h4>
        <h5>Auto Swap, done decentralised in your browser</h5>
        <div>
          <b>Make a note of this phrase!</b>
          <br />
          <textarea
            id="phrase"
            name="phrase"
            value={phrase}
            onChange={(e) => {
              setPhrase(e.target.value) && setAutoswap(false);
            }}
            onClick={(e) => {
              //copy to clipboard
              navigator.clipboard.writeText(phrase).then(() => {
                setInfo("Copied Phrase to clipboard");
              });
            }}
            style={styles.textarea}
          ></textarea>
          <br />
          You can also enter a previously generated Bitx phrase here.
          <br />
          Do no use one from any other wallet!
          <br />
          <button
            className="btn_copy"
            onClick={(e) => {
              navigator.clipboard.writeText(phrase).then(() => {
                setStep(2);
              });
            }}
          >
            Copy and Continue...
          </button>
          <div>
            <br />
            This phrase the only way to recover your funds should your
            connection be lost or your browser reloaded.
            <br />
            This transaction is completed inside your browser, your phrase is
            not sent to us.
            <br />
            <b>You must leave this window open</b> until the payment is on its
            way to the destination <br /> or <b>YOU WILL LOSE YOUR MONEY</b>
          </div>
        </div>
                  <br />
          <button
            className="btn_copy"
            onClick={(e) => {
                setStep(2);
            
            }}
          >
            Continue...
          </button>
      </div>
      <div className="hflex_whenwide infomsgdiv">
        <div id="error_phrase" className={msgColour}>
          {msg}
        </div>
        <div>
          <input
            type="checkbox"
            id="autoswap"
            name="autoswap"
            checked={autoswap}
            onChange={(e) => setAutoswap(e.target.checked)}
          />
          <label htmlFor="autoswap">Auto Swap</label>
        </div>
      </div>
      <div className={step !== 2 ? "hid" : ""}>
        {swapLink !== "" && (
          <div className="sharediv">
            Share this request:
            <br />{" "}
            <button
              className="btn_copy"
              target="_blank"
              onClick={(e) =>
                e.preventDefault() &
                navigator.clipboard.writeText(swapLink).then(() => {
                  setInfo("Copied Share URL to clipboard");
                })
              }
            >
              {" "}
              <i className="fa fa-clipboard" aria-hidden="true">
                {" "}
              </i>
              {swapLink}
            </button>
          </div>
        )}

        <div className="hflex_whenwide mt nmb">
          <div className="input_destination_addr nmt">
            <div className="input_title">
              Enter the destination address:{" "}
              <button
                onClick={props.onShowQRPop}
                style={{ marginLeft: "10px", display: "inline-block" }}
              >
                <i className="fa fa-qrcode" aria-hidden="true">
                  {" "}
                </i>
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
              type="text"
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
                }, 5000);
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
          <div className="transfer_type">
            <div className="transfer_to input_destination_type">
              <div style={{ marginTop: 0,width:'fit-content' }}>
                {toTypes.map((chainID) => {
                  return (
                    <div key={chainID}>
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
                      <label htmlFor={"to_" + chainID}>
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
        <div className="hflex_whenwide">
          <div className="transfer_type">
            <div className="transfer_from">
              <div style={{ marginTop: 0 }}>
                <div>
                  {" "}
                  <b>Pay with:</b>
                </div>
                {fromTypes.map((chainID) => {
                  return (
                    <div key={chainID}>
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
                      <label htmlFor={"from_" + chainID}>
                        {shortName(chainID.toUpperCase())}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {!transferType ||
          (transferType[0] === "" && (
            <div className="div_transfer h div_qr">
              Please select a transfer type and a destination.
              <div>
                <button
                  onClick={props.onShowQRPop}
                  style={{ marginLeft: "10px", display: "inline-block" }}
                >
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
                  }}
                >
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
                }}
              >
                {walletaddress}
              </div>
              <QRCode value={walletaddress} />
              <div>
                Current Balance: {walletbalance} ({differenceFromSell})
              </div>
            </div>
          </div>
        )}
        <br />
        <div className="input_slippage">
          {" "}
          Received amount could be 1% different due to slippage and also small
          differences due to gas fees.
          <br />
          Swap Fee: 1%
        </div>
        <div className="{(devButtons || isDevMode)? '' : 'hid'}">
          <h3>Dev buttons.. swap is automatic!</h3>
          <button
            type="button"
            onClick={() => {
              console.log(skClient.connectedChains);
              doSwap();
            }}
          >
            Swap
          </button>
          <button type="button" onClick={() => setPhrase(generatePhrase())}>
            Generate Phrase
          </button>
          <button
            type="button"
            onClick={() => connectWallet(WalletOption.KEYSTORE)}
          >
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
          <button
            type="button"
            onClick={() => {
              setOriginBalances(["0", "0", 0]);
            }}
          >
            Set Origin Balances
          </button>

          <div>
            <a href="{txUrl}" target="_blank">
              View TX {txUrl}
            </a>
          </div>
        </div>
        <div id="fetching_balances">...</div>
      </div>
    </div>
  );
}

export default Bitx;

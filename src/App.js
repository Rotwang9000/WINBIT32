import './App.css';
import { get, set, useForm } from "react-hook-form";
import { Chain, FeeOption } from '@thorswap-lib/types';
import { SwapKitCore } from '@thorswap-lib/swapkit-core';
import { keystoreWallet } from '@thorswap-lib/keystore';
import { AssetAmount, createSwapKit, WalletOption, SwapKitApi } from '@thorswap-lib/swapkit-sdk'
import { entropyToMnemonic, generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { useEffect, useState } from 'react';
import QRCode from "react-qr-code";
import "dotenv/config";


const styles = {
  container: {
    width: "80%",
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

const connectChains = [Chain.Ethereum, Chain.Bitcoin, Chain.THORChain];
const chainIDs = ["ETH", "BTC"];



function App() {
  function isDevMode() {
    if (window.location.hostname === "localhost") {
      return true;
    } else {
      return false;
    }
  }

  const devMode = isDevMode();

  const [txUrl, setTXUrl] = useState("");
  const [destinationAddr, setDestinationAddr] = useState("");
  //get from query string 'dest_amt' or set to 'MAX' if not set
  const [destinationAmt, setDestinationAmt] = useState("MAX");


  const [phrase, setPhrase] = useState("");
  const [wallets, setWallets] = useState([]);
  const [lastWalletGet, setLastWalletGet] = useState(0);
  const [balances, setBalances] = useState([]); // [{ balance: AssetAmount[]; address: string; walletType: WalletOption }
  const [originBalances, setOriginBalances] = useState(null);
  const [autoswap, setAutoswap] = useState(false);
  const [sellAmount, setSellAmount] = useState(0);
  const [slippage, setSlippage] = useState(1);
  const [routes, setRoutes] = useState([]); // [{ optimal: boolean; route: Route[] }
  const [msg, setMsg] = useState("");
  const [msgColour, setMsgColour] = useState("info_msg");
  const [transferType, setTransferType] = useState(["", ""]); //['source', 'dest'] or [] for none eg. ['btc', 'eth']

  function setError(msg) {
    if (typeof msg === "object") {
      msg = msg.message;
    }
    setMsg(msg);
    setMsgColour("error_msg");
  }
  function setInfo(msg) {
    setMsg(msg);
    setMsgColour("info_msg");
  }

  function generatePhrase(size = 12) {
    const entropy = size === 12 ? 128 : 256;

    return generateMnemonic(wordlist, entropy);
  }

  async function getAQuote(sellAmt = 0, loop = 0) {
    if (sellAmount === -1) return;
    if (destinationAmt !== "MAX" && isNaN(destinationAmt.replace("%", "")))
      return;

    setSellAmount(-1);

    //if destination amount is MAX, get the balance of the destination wallet and use that as the destination amount
    if (
      sellAmt === 0 &&
      (destinationAmt === "MAX" || // or contains a % sign
        destinationAmt.substring(destinationAmt.length - 1) === "%") &&
      wallets[0] &&
      wallets[0].balance[0] &&
      wallets[0].balance[0].assetAmount > 0
    ) {
      var bal = parseFloat(wallets[0].balance[0].assetAmount.toString());
      var pct = parseFloat(destinationAmt.replace("%", ""));
      if (isNaN(pct)) pct = 100;
      sellAmt = bal * (pct / 100);
      console.log(sellAmt);
      return getAQuote(sellAmt);
    }

    console.log("getting quote");
    if (transferType.length !== 2) return;
    if (!wallets[0] || !wallets[1]) return;
    var assets = [];
    for (var i = 0; i < transferType.length; i++) {
      if (transferType[i] === "eth") {
        assets.push("ETH.ETH");
      } else if (transferType[i] === "btc") {
        assets.push("BTC.BTC");
      }
    }

    console.log(assets);
    console.log(wallets);
    //get the right wallet for each asset
    var walletsForAssets = [];
    for (var i = 0; i < assets.length; i++) {
      for (var j = 0; j < 2; j++) {
        if (
          wallets[j].balance[0].asset.chain +
            "." +
            wallets[j].balance[0].asset.symbol ===
          assets[i]
        ) {
          walletsForAssets.push(wallets[j]);
        }
      }
    }

    const affiliateBasisPoints = 100; //100 = 1%

    const quoteParams = {
      sellAsset: assets[0],
      buyAsset: assets[1],
      senderAddress: walletsForAssets[0].address, // A valid Bitcoin address
      recipientAddress: destinationAddr, // A valid Ethereum address
      slippage: slippage, // 1 = 1%
    };

    var testAmt = 1;

    if (sellAmt > 0) {
      quoteParams.sellAmount = sellAmt;
      testAmt = sellAmt;
      quoteParams.affiliateBasisPoints = affiliateBasisPoints; //100 = 1%
      quoteParams.affiliateAddress = "me";
    } else {
      //calculate the rate so we can calculate the sell amount to get the right destination amount
      quoteParams.sellAmount = testAmt;
      quoteParams.affiliateBasisPoints = 0; //100 = 1%
      quoteParams.affiliateAddress = "me";
    }

    console.log(quoteParams);

    var routes = await SwapKitApi.getQuote(quoteParams);

    if (routes.message) {
      console.log(routes.message);
      //set #error_phrase
      setError(routes.message.split(":").pop());
      setSellAmount(0);
      return;
    }
    routes = routes.routes;

    // routes = await routes;
    console.log("routes");
    console.log(routes);

    setRoutes(routes);
    console.log(routes);
    if (routes === undefined) {
      setSellAmount(0);
      return;
    }
    //if expectedOutputMaxSlippage is 0 then there is no route
    if (routes[0].expectedOutputMaxSlippage === 0) {
      setSellAmount(0);
      console.log("no route");

      return;
    }
    var eoms_pc = 1;

    //if expectedOutputMaxSlippage is more than 1% out either way, calculate again
    if (!isNaN(destinationAmt)) {
      eoms_pc =
        parseFloat(routes[0].expectedOutputMaxSlippage.toString()) /
        destinationAmt;
      //get abs difference
      eoms_pc = Math.abs(eoms_pc - 1) * 100;
      console.log("eoms_pc");

      console.log(eoms_pc);
    }
    var eoms_ok = false;
    //permit 3% eoms_pc below 500 usd, 1% above 500 usd
    if (parseFloat(routes[0].expectedOutputUSD.toString()) < 500) {
      if (eoms_pc < 3) {
        eoms_ok = true;
      }
    } else {
      if (eoms_pc < 1) {
        eoms_ok = true;
      }
    }

    if (loop > 5) {
      //if we've tried 5 times, give up
      setDestinationAmt(routes[0].expectedOutputMaxSlippage.toString());
      setSellAmount(0);
      console.log("giving up");
      eoms_pc = 1;
    }

    if (sellAmt === 0 || eoms_ok === false) {
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
        setSellAmount(0);
        return;
      }

      //get rate
      var rate = parseFloat(r.expectedOutputMaxSlippage.toString()) / testAmt;
      console.log(rate);
      //get destination amount
      var destAmt = parseFloat(destinationAmt);
      if (destinationAmt === "MAX") {
        destAmt = parseFloat(wallets[1].balance[0].assetAmount.toString());
      }

      console.log(destAmt);
      //calculate sell amount, taking fee into account and adding for slippage
      //get total fees in USD
      var fees = 0;
      //get first in r.fees array
      var feesArray = r.fees[Object.keys(r.fees)[0]];
      for (var i = 0; i < feesArray; i++) {
        var fee = feesArray[i];
        var feeUSD = parseFloat(fee.totalFeeUSD.toString());
        fees += feeUSD;
        //remvoe slip fee if it exists
        if (fee.slipFeeUSD && sellAmt === 0) {
          fees -= parseFloat(fee.slipFeeUSD.toString());
          fees += 5;
        }
      }

      console.log(fees);
      //get total fees in dest asset
      var destAssetUSDRate =
        parseFloat(r.expectedOutputUSD.toString()) /
        parseFloat(r.expectedOutput.toString());

      console.log(destAssetUSDRate);
      var destAssetFees = fees / destAssetUSDRate;
      console.log(destAssetFees);
      //consider fees in rate
      console.log(rate);
      //callculate affiliate fees %
      var affiliateFeesPct = affiliateBasisPoints / 100; // affiliateFees / destAssetUSDRate
      console.log("affiliateFeesPct");
      console.log(affiliateFeesPct);

      //multiply fees by 1.2 to be "average"
      //destAssetFees = destAssetFees * 1.2;
      //rate = rate * (1 + affiliateFeesPct/100)
      rate = rate + destAssetFees; //* (1 + affiliateFeesPct/100);
      console.log(rate);

      var newsellAmt = destAmt / rate;
      newsellAmt = newsellAmt * (1 + affiliateFeesPct / 100);
      console.log(newsellAmt);
      return getAQuote(newsellAmt, loop + 1);
    } else {
      console.log("we good: " + eoms_pc);
      console.log(routes);
      setSellAmount(sellAmt);
      setRoutes(routes);

      doSwapIf();
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
                setInfo("Connected to wallet!");
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
    if (devMode) {
      setDestinationAddr("0xdc5e0658fd59000e656b00244418774233d84326");
      setDestinationAmt('0.01');
    }

    const interval = setInterval(() => {
      if (!wallets[0] || !wallets[1]) return;

      if (autoswap) {
        fetchWalletBalances();
      }
      if (
        originBalances &&
        originBalances.length > 1 &&
        wallets[0] &&
        wallets[1] &&
        wallets[0].balance[0] &&
        wallets[1].balance[0] &&
        (wallets[0].balance[0].assetAmount > originBalances[0] ||
          wallets[1].balance[0].assetAmount > originBalances[1])
      ) {
        getAQuote();
      }
    }, 20000);
    return () => clearInterval(interval);

    
  }, []);

  //get a quote when destination amount changes
  useEffect(() => {
    if (!wallets[0] || !wallets[1]) return;
    //if destination amount is not MAX and hasn't got focus, and is a number get a quote
    if (
      destinationAmt !== "MAX" &&
      document.getElementById("destination_amt").dataset.oAutoSwap === "" &&
      !isNaN(destinationAmt) &&
      destinationAmt !== sellAmount
    ) {
      getAQuote();
    }
  }, [destinationAmt]);

  //hide loading overlay when wallets are loaded
  useEffect(() => {
    try {
      document.getElementById("fetching_balances").style.display = "none";

      console.log(wallets);

      if (
        wallets[0] &&
        wallets[1] &&
        wallets[0].balance[0] &&
        wallets[1].balance[0]
      ) {
        document.getElementsByClassName("loading_overlay")[0].style.display =
          "none";
        console.log("wallets loaded, setting balances");
        setTheBalances(wallets);
      }
    } catch (error) {}
  }, [wallets]);

  function selectSendingWallet() {
    //select sending wallet based on transferType[0]
    var transfer_type_from = transferType[0];
    for (var i = 0; i < chainIDs.length; i++) {
      if (chainIDs[i].toLowerCase() === transfer_type_from) {
        return wallets[i];
      }
    }
    return null;
  }

  useEffect(() => {
    if (!wallets[0] || !wallets[1]) return;
    if (!originBalances) return;
    if (originBalances.length !== 2) return;
    if (originBalances[0] === "" || originBalances[1] === "") return;
    if (sellAmount <= 0) return;

    //select sending wallet based on transferType[0]
    var sendingWallet = selectSendingWallet();

    //if enough in wallet 0 then do the swap
    const bal = parseFloat(sendingWallet.balance[0].assetAmount.toString());

    if (bal > originBalances[0] && bal >= sellAmount && autoswap) {
      setAutoswap(false);

      doSwap();
    }
  }, [sellAmount, balances, originBalances, wallets]);

  function setTheBalances(walletdata = null) {
    var _balances = [];
    if (!walletdata) walletdata = wallets;

    for (var i = 0; i < walletdata.length; i++) {
      var _wallet = walletdata[i];
      var balance = 0;
      if (_wallet.balance[0] && _wallet.balance[0].assetAmount) {
        balance = _wallet.balance[0].assetAmount.toString();
      }
      _balances.push(balance);
    }
    console.log("balances", _balances);
    if (!originBalances) {
      console.log("setting origin balances");
      setOriginBalances(_balances);
    }
    if (_balances !== balances) {
      setBalances(_balances);
    }
  }

  function fetchWalletsAfterConnect() {
    try {
      skClient.getWalletByChain(Chain.Ethereum);

      fetchWalletBalances();
    } catch (error) {
      console.log(error);
      setWallets([]);
      setOriginBalances(null);
    }
    // [{ balance: AssetAmount[]; address: string; walletType: WalletOption }]
  }

  async function fetchWalletBalances() {
    //only call this once every 10 seconds
    if (Date.now() - lastWalletGet < 10000) return;
    setLastWalletGet(Date.now());

    //setWallets(await Promise.all(connectChains.map(skClient.getWalletByChain)) || [] );
    Promise.all(connectChains.map(skClient.getWalletByChain)).then((result) => {
      console.log("result");
      console.log(result);
      if (!result) {
        console.log("no result");
        setWallets([]);
        setOriginBalances(null);
        return;
      }
      setWallets(result);
      setTheBalances(result);
    });

    console.log("wallets");
  }

  //update balances

  useEffect(() => {
    //show fetching_balances div
    document.getElementById("fetching_balances").style.display = "block";
  }, [lastWalletGet]);

  function genConnect(data) {
    connectWallet(WalletOption.KEYSTORE);
    //fetchWallets();
    // { username: 'test', email: 'test', password: 'test' }
  }
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
  }, []);

  function doSwapIf() {
    if (autoswap) {
      //check balance
      wallet = selectSendingWallet();
      if (wallet.balance[0].assetAmount > sellAmount) {
        //check quote is made in past 2mins
        if (Date.now() - lastWalletGet < 120000) {
          doSwap();
        } else {
          //get a quote
          getAQuote();
        }
      }
    }
  }

  function doSwap() {
    if (!wallets[0] || !wallets[1]) return;
    if (!routes[0]) return;

    console.log("doing swap");
    console.log(routes);

    //const routes = getAQuote();
    const bestRoute = routes.find(({ optimal }) => optimal);

    console.log(bestRoute);

    const swapParams = {
      route: bestRoute,
      recipient: destinationAddr,
      feeOptionKey: FeeOption.Average,
      // FeeOption multiplies current base fee by:
      // Average => 1.2
      // Fast => 1.5
      // Fastest => 2
    };
    console.log(swapParams);
    console.log(skClient);

    const txHash = skClient.swap(swapParams);

    if (!txHash) {
      console.log("no tx hash");
      return;
    }
    try {
      //get input chain from route
      const inputChain = bestRoute.meta.buyChain;

      // Returns explorer url like etherscan, viewblock, etc.
      const explorerUrl = skClient.getExplorerTxUrl(inputChain, txHash);

      // Returns explorer url like etherscan, viewblock, etc.
      setTXUrl(explorerUrl);
      return explorerUrl;
    } catch (error) {
      console.log(error);
    }
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
    if (destinationAddr.substring(0, 2) === "0x" && destinationAddr.length > 2 && transferType[1] !== 'eth') {
      setTransferType(["btc", "eth"]);
    } else if (
      (destinationAddr.substring(0, 1) === "1" ||
      destinationAddr.substring(0, 3) === "bc1") && transferType[1] !== 'btc'
    ) {
      setTransferType(["eth", "btc"]);
      // }else{
      //   setTransferType('');
    }
  }, [destinationAddr]);

  //get wallet address from transferType
  var walletaddress = "";
  //walletindex = transferType[0] index from chainIDs.tolower
  var walletindex = -1;
  for (var i = 0; i < chainIDs.length; i++) {
    if (chainIDs[i].toLowerCase() === transferType[0]) {
      walletindex = i;
    }
  }
  var wallet = wallets[walletindex];
  var walletbalance = "";
  if (wallet) {
    try {
      walletaddress = wallet.address;
      walletbalance = wallet.balance[0].assetAmount.toString();
    } catch (error) {}
  }

  var sellAmountTxt = "";
  if (sellAmount > 0) {
    var ruSellAmount = Math.ceil(sellAmount * 1000000) / 1000000;
    sellAmountTxt = ruSellAmount.toString();
  } else if (sellAmount === -1) {
    //loading gif
    sellAmountTxt = "...";
  }

  console.log(originBalances);

  return (
    <div style={styles.container}>
      <h4>Swap in your browser</h4>
      <div className="hflex_whenwide">
        <div>
          <b>Make a note of this phrase!</b>
          <br />
          It is the only way to recover your funds should your connection be
          lost or your browser reloaded.
          <br />
          This transaction is completed inside your browser, your phrase is not
          sent to us.
          <br />
          <b>You must leave this window open</b> until the payment is on its way
          to the destination <br /> or <b>YOU WILL LOSE YOUR MONEY</b>
        </div>
        <div>
          You can also enter your own phrase here:
          <br />
          <textarea
            id="phrase"
            name="phrase"
            value={phrase}
            onChange={(e) => {
              setPhrase(e.target.value) && setAutoswap(false);
            }}
            style={styles.textarea}
          ></textarea>
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
      </div>
      <hr />
      <div className="hflex_whenwide">
        <div className="input_destination_addr">
          Enter the destination address:
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
        <div className="fixed_destination_addr">{destinationAddr}</div>
        <div className="input_destination_amt">
          Enter the destination amount
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
              getAQuote();
            }}
            onChange={(e) => setDestinationAmt(e.target.value)}
            value={destinationAmt}
            data-o-auto-swap=""
          />
        </div>
        <div className="fixed_destination_amt">{destinationAmt}</div>
      </div>
      <div>
        <div className="transfer_type">
          <div className="transfer_from">
            <b>Pay with:</b>
            {chainIDs.map((chainID) => {
              return (
                (chainID = chainID.toLowerCase()),
                (
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
                      {chainID.toUpperCase()}
                    </label>
                  </div>
                )
              );
            })}
          </div>
          <div className="transfer_to">
            <b>Receiver gets:</b>
            {chainIDs.map((chainID) => {
              return (
                (chainID = chainID.toLowerCase()),
                (
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
                      {chainID.toUpperCase()}
                    </label>
                  </div>
                )
              );
            })}
          </div>
        </div>
      </div>
      {transferType.length !== 2 && (
        <div className="error_transfer_type">Please select a transfer type</div>
      )}
      {transferType.length === 2 && (
        <div className="div_transfer">
          <div className="div_qr">
            <div id="send_to_msg">
              Send <span id="send_to_amt">{sellAmountTxt}</span>{" "}
              {transferType[0].toUpperCase()} to:
            </div>
            <div>{walletaddress}</div>
            <QRCode value={walletaddress} />
            <div>Current Balance: {walletbalance}</div>
          </div>
        </div>
      )}
      <br />
      <div className="input_slippage">
        {" "}
        Received amount could be 1% different due to slippage. Swap Fee: 1%
      </div>

      <button
        type="button"
        onClick={() => {
          console.log(skClient.connectedChains);
          doSwap();
        }}
      >
        Swap
      </button>
      <button type="button" onClick={() => getAQuote()}>
        Get Quote
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
          setOriginBalances([0, 0]);
        }}
      >
        Set Origin Balances
      </button>

      <div>
        <a href="{txUrl}" target="_blank">
          View TX {txUrl}
        </a>
      </div>
      <div id="fetching_balances">...</div>
    </div>
  );
}

export default App;

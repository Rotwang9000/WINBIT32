//QR popup window, child of App, return by calling setDestinationAddr in App

import React, { Component } from 'react';
import { QrReader } from "react-qr-reader";

var qr_on_screen = false;

class QrPop extends Component {
	  constructor(props) {
	super(props);
	this.state = {
	  delay: 1000,
	  result: "",
	};
	this.handleScan = this.handleScan.bind(this);
  }
  handleScan (data) {
	if (data) {
    this.setState({
      result: data,
    });
        this.props.onQRRead(data.text);
  
  }

  }
  handleError(err) {
	console.error(err);
  }
//   shouldComponentUpdate(nextProps, nextState) {
// 		if(this.state.result !== '') return true;
	
// 		console.log("shouldComponentUpdate");
// 	  console.log(nextProps);
// 	  console.log(nextState);
// 	  return false;
// 	}
  
// 	//should destroy the popup window 10 seconsd after it is closed
// 	componentWillUnmount() {
// 		this.state.result = '';
// 		console.log("componentWillUnmount");
// 		qr_on_screen = false;

	
// 		setTimeout(() => {
//       //remove QR reader from DOM
// 	  document.getElementById("dest_qr_reader").innerHTML = "";
      
//     }, 10000);

// 	}


  render() {
	  console.log("qrpop.js");
	//open the popup window just once. do not show again if already open as QR reader can only be one per document

    return (
      <>
        <div className="qr_reader_div" id="dest_qr_reader_internal">
          <button
            onClick={() => {
              this.props.closeQrPop();
            }}
          >
            Cancel
          </button>
          <QrReader
            delay={this.state.delay}
            onError={this.handleError}
            onScan={this.handleScan}
            onResult={this.handleScan}
            style={{ width: "100%" }}
            
            facingMode={"environment"}
          />
          <p>{this.state.result}</p>
        </div>
      </>
    );
  }
  
}

export default QrPop;
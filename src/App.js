import React from "react";
import Bitx from "./bitx";
import QRpop from "./qrpop";

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      qrResult: null,
      showQRPop: false,
    };
  }

  handleQRRead = (data) => {
    this.setState({ qrResult: data, showQRPop: false });
  };

  toggleQRPop = () => {
    console.log("toggleQRPop");
    this.setState((prevState) => ({ showQRPop: !prevState.showQRPop }));
  };

  render() {
    return (
      <>
        {this.state.showQRPop && (
          <QRpop onQRRead={this.handleQRRead} closeQrPop={this.toggleQRPop} />
        )}

        <Bitx qrResult={this.state.qrResult} onShowQRPop={this.toggleQRPop} />
      </>
    );
  }
}

export default App;
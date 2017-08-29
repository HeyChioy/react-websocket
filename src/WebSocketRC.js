import React from 'react';
import PropTypes from 'prop-types';

class WebSocketRC extends React.Component {
    constructor(props) {
        super(props);
        const { url, protocol } = props; // Config
        const { actionKey = 'SYS_ACTION', actionMap = {} } = props;
        this.shouldClose = false;
        this.retryTimes = 1;
        this.state = {
            // Config
            url,
            protocol,
            actionKey,
            actionMap,
        };
    }
    handleMessage = ({ data }) => {
        try {
            const json = JSON.parse(data);
            const action = json[this.props.actionKey];
            const handler = this.props.actionMap[action];
            if (action && handler) {
                handler(json);
            } else {
                this.props.onMessage(json);
            }
        } catch (e) {
            const result = { rawText: data};
            this.props.onMessage(result);
        }
    };
    componentWillMount() {
        this.initWebSocket();
    }
    componentWillUnmount() {
        this.shouldClose = true;
        this.ws.close();
    }
    closeOldSocket = () => {
      if (this.ws && this.ws.readyState === ws.CONNECTING) {
          this.shouldClose = true;
          this.ws.close();
      }
    };
    initWebSocket() {
        this.closeOldSocket();
        const ws = new WebSocket(this.props.url, this.props.protocol);
        ws.onclose = () => {
            console.log(this.retryTimes);
            if (this.shouldClose || this.retryTimes++ > ( this.props.maxRetryTimes || 3)) {
                this.props.onClose();
                return;
            }
            this.props.onRetry && this.props.onRetry();
            setTimeout(() => {
                this.initWebSocket();
            }, this.props.retryDelay || 3000);
        };
        ws.onerror = (e) => {
            this.props.onError(e);
            ws.close();
        };
        ws.onmessage = this.handleMessage;
        const decorator = {
            send(data) {
                const sendData = data.constructor === String ?
                    data: JSON.stringify(data);
                ws.send(sendData);
            }
        };
        ws.onopen = () => {
            this.retryTimes = 1;
            this.ws = ws;
            this.props.onCreate(decorator, ws);
        }
    }
    render() {
        return (
            <span style={{ display: 'none' }}>WebSocket React Component by KyuuSeiryuu.</span>
        );
    }
}

WebSocketRC.propTypes = {
    url: PropTypes.string.isRequired,
    protocol: PropTypes.string,
    onMessage: PropTypes.func.isRequired,
    onCreate: PropTypes.func,
    onClose: PropTypes.func,
    onError: PropTypes.func,
    onRetry: PropTypes.func,
    actionMap: PropTypes.object,
    actionKey: PropTypes.string,
    autoReconnect: PropTypes.bool,
    maxRetryTimes: PropTypes.number,
    retryDelay: PropTypes.number,
};

export default WebSocketRC;

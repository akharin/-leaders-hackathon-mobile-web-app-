import React, {Component} from "react";
import './App.css';
import io from 'socket.io-client';
import {backendUrl} from "../../backendUrl";

class App extends Component {
	socket = undefined;
	timer = undefined;
	phoneInput = React.createRef();
	passInput = React.createRef();

	constructor(props) {
		super(props);

		this.state = {
			userId: undefined,
			objectId: undefined,
			objects: [],
			log: undefined
		};
	}


	componentDidMount() {
		this.socket = io(backendUrl, {path: '/api/ws', withCredentials: false});
		this.getObjects();
	}

	componentWillUnmount() {
		if (this.socket) {
			this.socket.disconnect();
		}
	}

	render() {
		const {userId, objectId, objects, log} = this.state;

		return (
			<div className="app">
				<header className="header">
					<h1 className="header__title">Отправка местоположения</h1>
				</header>

				{userId ? (
					<div>
						<select value={objectId} onChange={this.changeObject}>
							{objects.map(object => (
								<option key={object._id} value={object._id}>{object.name}</option>
							))}
						</select>

						<button onClick={this.startSending}>Начать</button>
						<button onClick={this.stopSending}>Закончить</button>
					</div>
				) : (
					<div>
						<input type="tel" placeholder="Телефон" ref={this.phoneInput}/>
						<input type="password" placeholder="Пароль" ref={this.passInput}/>
						<button onClick={this.login}>Войти</button>
					</div>
				)}


				<div>
					{log}
				</div>
			</div>
		);
	}

	startSending = () => {
		if (!navigator.geolocation) {
			return alert('Geolocation is not supported by your browser');
		}
		this.timer = setInterval(() => {
			navigator.geolocation.getCurrentPosition(this.sendLocation, this.handleError, {
				enableHighAccuracy: true,
				timeout: 1000,
				maximumAge: 0
			})
		}, 1000);
	};

	stopSending = () => {
		if (this.timer) {
			clearInterval(this.timer)
		}
	};

	sendLocation = ({coords}) => {
		if (this.socket) {
			const {userId, objectId} = this.state;
			this.socket.emit('sendLocation', {
				userId,
				objectId,
				lat: coords.latitude,
				lng: coords.longitude,
				alt: coords.altitude
			});
			this.setState({log: `lat: ${coords.latitude}, lng: ${coords.longitude}, alt: ${coords.altitude}`});
		}
	};

	handleError = (error) => {
		console.log(error);
		this.setState({log: 'Error: ' + error && error.message});
	};

	login = async () => {
		if (this.phoneInput.current.value && this.passInput.current.value) {
			try {
				const urlencoded = new URLSearchParams();
				urlencoded.append('phone', this.phoneInput.current.value);
				urlencoded.append('password', this.passInput.current.value);
				const requestOptions = {
					method: 'POST',
					body: urlencoded
				};
				const response = await fetch(`${backendUrl}/api/auth/login`, requestOptions);
				if (response.ok) {
					const user = await response.json();
					if (user) {
						this.setState({userId: user._id});
					}
				}
			} catch (error) {
				console.error(error);
			}
		}
	};

	getObjects = async () => {
		try {
			const response = await fetch(`${backendUrl}/api/objects`);
			if (response.ok) {
				const objects = await response.json();
				this.setState({objects, objectId: objects.length ? objects[0]._id : undefined});
			}
		} catch (error) {
			console.error(error);
		}
	};

	changeObject = (event) => {
		this.setState({objectId: event.target.value})
	};
}

export default App;

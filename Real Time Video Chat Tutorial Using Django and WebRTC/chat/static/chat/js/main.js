// selectors
const labelUsername = document.getElementById("label-username");
const usernameInput = document.getElementById("username");
const btnJoin = document.getElementById("btn-join");

let websocket;
let username;

function websocketOnMessage(event) {
    var parseData = JSON.parse(event.data);
    var message = parseData['message'];

    console.log('message:', message);
}

// add click event listener for join button
btnJoin.addEventListener('click', (e) => {
    // if input field is empty return
    if (usernameInput.value === '') return;

    // update username
    username = usernameInput.value;
    labelUsername.innerHTML = username;

    console.log('username:', username);

    // clear, disable and hide input field
    usernameInput.value = '';
    usernameInput.disabled = true;
    usernameInput.style.visibility = 'hidden';

    // disable and hide join field
    e.target.disabled = true;
    e.target.style.visibility = 'hidden';

    // set websocket url
    const scheme = window.location.protocol === 'https' ? 'wss://' : 'ws://';
    const endpoint = scheme + window.location.host + window.location.pathname;

    console.log('endpoint:', endpoint);

    // create new websocket connection
    websocket = new WebSocket(endpoint);

    websocket.addEventListener('open', (e) => {
        console.log('Connection Opened!');

        const jsonStr = JSON.stringify({ message: 'This is message' });

        websocket.send(jsonStr);
    });

    websocket.addEventListener('message', websocketOnMessage);

    websocket.addEventListener('close', (e) => {
        console.log('Connection Closed!');
    });

    websocket.addEventListener('error', (e) => {
        console.log('Error Occurred!', e);
    });

});
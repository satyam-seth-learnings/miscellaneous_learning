// selectors
const labelUsername = document.getElementById("label-username");
const usernameInput = document.getElementById("username");
const btnJoin = document.getElementById("btn-join");

let websocket;
let username;
const mapPeers = {};

function websocketOnMessage(event) {
    const parseData = JSON.parse(event.data);
    const peerUsername = parseData['peer'];
    const action = parseData['action'];

    if (username === peerUsername) return;

    const receiverChannelName = parseData['message']['receiver_channel_name']

    if (action === 'new-peer') {
        createOfferer(peerUsername, receiverChannelName);
        return;
    }

    if (action === 'new-offer') {
        const offer = parseData['message']['sdp'];

        createAnswerer(offer, peerUsername, receiverChannelName);
        return;
    }

    if (action === 'new-answer') {
        const answer = parseData['message']['sdp'];

        const peer = mapPeers[peerUsername][0];

        peer.setRemoteDescription(answer)
        return;
    }
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
    const scheme = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const endpoint = scheme + window.location.host + window.location.pathname;

    console.log('endpoint:', endpoint);

    // create new websocket connection
    websocket = new WebSocket(endpoint);

    websocket.addEventListener('open', (e) => {
        console.log('Connection Opened!');

        // const jsonStr = JSON.stringify({ message: 'This is message' });

        sendSignal('new-peer', {});
    });

    websocket.addEventListener('message', websocketOnMessage);

    websocket.addEventListener('close', (e) => {
        console.log('Connection Closed!');
    });

    websocket.addEventListener('error', (e) => {
        console.log('Error Occurred!', e);
    });
});

const localVideo = document.getElementById("local-video");
const btnToggleAudio = document.getElementById("btn-toggle-audio");
const btnToggleVideo = document.getElementById("btn-toggle-video");

let localStream;

const constrains = {
    'video': true,
    'audio': true,
};

const userMedia = navigator.mediaDevices.getUserMedia(constrains)
    .then(stream => {
        localStream = stream;
        localVideo.srcObject = localStream;
        localVideo.muted = true;

        const audioTracks = stream.getAudioTracks();
        const videoTracks = stream.getVideoTracks();

        audioTracks[0].enabled = true;
        videoTracks[0].enabled = true;

        btnToggleAudio.addEventListener('click', () => {
            audioTracks[0].enabled = !audioTracks[0].enabled;

            btnToggleAudio.innerHTML = audioTracks[0].enabled ? 'Audio Mute' : 'Audio Unmute';
        });

        btnToggleVideo.addEventListener('click', () => {
            videoTracks[0].enabled = !videoTracks[0].enabled;

            btnToggleVideo.innerHTML = videoTracks[0].enabled ? 'Video Off' : 'Video On';
        });
    }).catch(error => {
        console.log('Error accessing media devices.', error);
    });

const btnSendMsg = document.getElementById("btn-send-msg");
const messageList = document.getElementById("message-list");
const messageInput = document.getElementById("msg");

btnSendMsg.addEventListener('click', sendOnClick);

function sendOnClick() {
    const li = document.createElement('li');
    li.innerHTML = `Me: ${messageInput.value}`;
    messageList.appendChild(li);

    const dataChannels = getDataChannels();

    const message = `${username}: ${messageInput.value}`;

    for (index in dataChannels) {
        dataChannels[index].send(message);
    }

    messageInput.value = '';
}

function sendSignal(action, message) {
    const jsonStr = JSON.stringify({
        'peer': username,
        'action': action,
        'message': message,
    });

    websocket.send(jsonStr);
}

function createOfferer(peerUsername, receiverChannelName) {
    // TODO: pass stun and turn servers config
    const peer = new RTCPeerConnection(null);

    addLocalTracks(peer);

    const dc = peer.createDataChannel('channel');
    dc.addEventListener('open', () => {
        console.log('Connection opened!');
    });

    dc.addEventListener('message', dcOnMessage);

    const remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    mapPeers[peerUsername] = [peer, dc];

    peer.addEventListener('iceconnectionstatechange', () => {
        const iceConnectionState = peer.iceConnectionState;

        if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed') {
            delete mapPeers[peerUsername];

            if (iceConnectionState !== 'closed') {
                peer.close();
            }

            removeVideo(remoteVideo);
        }
    });

    peer.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
            console.log('New ice candidate:', JSON.stringify(peer.localDescription));
            return;
        }

        sendSignal('new-offer', {
            'sdp': peer.localDescription,
            'receiver_channel_name': receiverChannelName,
        });
    });

    peer.createOffer()
        .then(o => peer.setLocalDescription(o))
        .then(() => {
            console.log('Local description set successfully.');
        });
}

function createAnswerer(offer, peerUsername, receiverChannelName) {
    // TODO: pass stun and turn servers config
    const peer = new RTCPeerConnection(null);

    addLocalTracks(peer);

    const remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    peer.addEventListener('datachannel', e => {
        peer.dc = e.channel;
        peer.dc.addEventListener('open', () => {
            console.log('Connection opened!');
        });

        peer.dc.addEventListener('message', dcOnMessage);

        mapPeers[peerUsername] = [peer, peer.dc];
    });


    peer.addEventListener('iceconnectionstatechange', () => {
        const iceConnectionState = peer.iceConnectionState;

        if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed') {
            delete mapPeers[peerUsername];

            if (iceConnectionState !== 'closed') {
                peer.close();
            }

            removeVideo(remoteVideo);
        }
    });

    peer.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
            console.log('New ice candidate:', JSON.stringify(peer.localDescription));
            return;
        }

        sendSignal('new-answer', {
            'sdp': peer.localDescription,
            'receiver_channel_name': receiverChannelName,
        });
    });

    peer.setRemoteDescription(offer)
        .then(() => {
            console.log(`Remote description set successfully for ${peerUsername}.`);

            return peer.createAnswer();
        })
        .then(a => {
            console.log('Answer created!');

            peer.setLocalDescription(a);
        })
}

function addLocalTracks(peer) {
    localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
    });
}

function dcOnMessage(event) {
    const li = document.createElement('li');
    li.innerText = event.data;
    messageList.appendChild(li);
}

function createVideo(peerUsername) {
    const videoContainer = document.getElementById('video-container');

    const remoteVideo = document.createElement('video');
    remoteVideo.id = `${peerUsername}-video`;
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;

    const videoWrapper = document.createElement('div');

    videoContainer.appendChild(videoWrapper);
    videoWrapper.appendChild(remoteVideo);

    return remoteVideo;
}

function setOnTrack(peer, remoteVideo) {
    const remoteStream = new MediaStream();

    remoteVideo.srcObject = remoteStream;

    peer.addEventListener('track', async (event) => {
        remoteStream.addTrack(event.track, remoteStream);
    });
}

function removeVideo(video) {
    const videoWrapper = video.parentNode;

    videoWrapper.parentNode.removeChild(videoWrapper);
}

function getDataChannels() {
    const dataChannels = [];

    for (peerUsername in mapPeers) {
        const dataChannel = mapPeers[peerUsername][1];

        dataChannels.push(dataChannel);
    }

    return dataChannels;
}
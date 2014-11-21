/* global Peer, THREE, THREEx */
'use strict';

// THREE vars
var scene, camera, renderer,
    cube, effect, element,
    texture,
    container = document.body;

// RTC vars
var peer = new Peer({key: 'lwjd5qra8257b9'}),
    destInput = document.getElementById('dest'),
    go = document.getElementById('go'),
    // remoteVideo = document.getElementById('remote'),
    video = document.createElement('video'),
    localStream, remoteStream, conn;

function initMedia() {
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

  // Setup the hidden video element for when we get a remote stream
  video.width = 1024;
  video.height = 768;
  video.autoplay = true;

  // Get the local media stream
  navigator.getUserMedia({
    video: true,
    // audio: true
  }, function(mediaStream) {
    localStream = mediaStream;
    destInput.disabled = false;
    go.disabled = false;
  }, function(err) {
    console.error(err);
  });
}

function initThree() {
  renderer = new THREE.WebGLRenderer();
  element = renderer.domElement;
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 10000);
  scene.add(camera);

  effect = new THREE.StereoEffect(renderer);
  effect.setSize(window.innerWidth, window.innerHeight);

  var geometry = new THREE.BoxGeometry(300, 300, 300);
  texture = new THREE.Texture(remoteStream);

  var material = new THREE.MeshBasicMaterial({ map: texture.texture });
  cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  camera.position.z = 400;
  scene.add(camera);

  window.addEventListener('resize', onResize, false);

  container.requestFullscreen = container.requestFullscreen || container.webkitRequestFullscreen || container.mozRequestFullscreen || container.msRequestFullscreen;
  // container.requestFullscreen();
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  effect.setSize(window.innerWidth, window.innerHeight);
}

var lastTimeMsec = null;
function render(nowMsec) {
  requestAnimationFrame(render);

  lastTimeMsec = lastTimeMsec || nowMsec-1000/60;
  var deltaMsec = Math.min(200, nowMsec - lastTimeMsec);
  lastTimeMsec = nowMsec;

  texture.update(deltaMsec/1000, nowMsec/1000);
  renderer.render(scene, camera);
  effect.render(scene, camera);
}

peer.on('open', function(id) {
  console.log(id);
  document.getElementById('myId').innerText = id;
});

go.onclick = function() {
  var dest = destInput.value;

  conn = peer.connect(dest);

  if (stream)
    peer.call(dest, stream)
    .on('stream', function(remoteStream) {
      remoteVideo.src = window.URL.createObjectURL(remoteStream);
    });

  console.log('Connecting to %s', dest);
};

peer.on('connection', function(conn) {
  conn.on('open', function() {
    console.log('Connection has been opened');

    conn.on('data', function(data) {
      console.log(data);
    });
  });
});

peer.on('call', function(call) {
  console.log('got a call');
  if (stream)
    call.answer(stream);

  call.on('stream', function(remoteStream) {
    remoteVideo.src = window.URL.createObjectURL(remoteStream);
  });
});

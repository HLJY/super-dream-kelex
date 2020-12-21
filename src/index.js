if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js')
      .then(reg => console.log('Service Worker: Registered (Pages)'))
      .catch(err => console.log(`Service Worker: Error: ${err}`));
  });
}

import './styles/index.scss';
import * as tf from '@tensorflow/tfjs';
import yolo from 'tfjs-yolo';
import QrScanner from 'qr-scanner'
import QrScannerWorkerPath from '!!file-loader!../node_modules/qr-scanner/qr-scanner-worker.min.js';
QrScanner.WORKER_PATH = QrScannerWorkerPath;

const loader = document.getElementById('loader');
const spinner = document.getElementById('spinner');
const webcam = document.getElementById('webcam');
const wrapper = document.getElementById('webcam-wrapper');
const rects = document.getElementById('rects');
const v3tiny = document.getElementById('v3tiny');

const canvas = document.getElementById('canvas');
canvas.width = 480;
canvas.height = 360;

let myYolo;
let selected;
let lockEnter = false;

(async function main() {
  try {
    await setupWebCam();
    // hideAll();
    v3tiny.addEventListener('click', () => load(v3tiny));

    run();
  } catch (e) {
    console.error(e);
  }
})();

async function setupWebCam() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const stream = await navigator.mediaDevices.getUserMedia({
      'audio': false,
      'video': { facingMode: 'environment' }
    });
    window.stream = stream;
    webcam.srcObject = stream;
  }
}

async function load(button) {
  if (myYolo) {
    myYolo.dispose();
    myYolo = null;
  }

  rects.innerHTML = '';
  loader.style.display = 'block';
  spinner.style.display = 'block';
  setButtons(button);

  setTimeout(async () => {
    progress(9);
    myYolo = await yolo.v3tiny();
  }, 200);
}

function setButtons(button) {
  v3tiny.className = '';
  button.className = 'selected';
  selected = button;

  document.getElementById('buttonGroup').style.display = "none";
}

function progress(totalModel) {
  let cnt = 0;
  Promise.all = (all => {
    return function then(reqs) {
      if (reqs.length === totalModel && cnt < totalModel * 2)
        reqs.map(req => {
          return req.then(r => {
            loader.setAttribute('percent', (++cnt / totalModel * 50).toFixed(1));
            if (cnt === totalModel * 2) {
              loader.style.display = 'none';
              spinner.style.display = 'none';
              loader.setAttribute('percent', '0.0');
            }
          });
        });
      return all.apply(this, arguments);
    }
  })(Promise.all);
}

async function run() {
  let interval = 1;
  if (myYolo) {
    let threshold = .3;
    if (selected == v3tiny)
      threshold = .2;
    else if (selected == v3)
      interval = 10;
    await predict(threshold);
  }
  setTimeout(run, interval * 100);
}

async function predict(threshold) {
  // console.log(`Start with ${tf.memory().numTensors} tensors`);

  const start = performance.now();
  const boxes = await myYolo.predict(webcam, { scoreThreshold: threshold });
  const end = performance.now();

  // console.log(`Inference took ${end - start} ms`);
  // console.log(`End with ${tf.memory().numTensors} tensors`);

  drawBoxes(boxes);
}

let colors = {};

function drawBoxes(boxes) {
  // console.log(boxes);

  const foundPerson = boxes.find(b => b.class === 'person')

  if (foundPerson) {
    personFound();
  } else {
    hideAll();
  }

  rects.innerHTML = '';

  const cw = webcam.clientWidth;
  const ch = webcam.clientHeight;
  const vw = webcam.videoWidth;
  const vh = webcam.videoHeight;

  const scaleW = cw / vw;
  const scaleH = ch / vh;

  wrapper.style.width = `${cw}px`;
  wrapper.style.height = `${ch}px`;

  boxes.map((box) => {
    if (!(box['class'] in colors)) {
      colors[box['class']] = '#' + Math.floor(Math.random() * 16777215).toString(16);
    }

    const rect = document.createElement('div');
    rect.className = 'rect';
    rect.style.top = `${box['top'] * scaleH}px`;
    rect.style.left = `${box['left'] * scaleW}px`;
    rect.style.width = `${box['width'] * scaleW - 4}px`;
    rect.style.height = `${box['height'] * scaleH - 4}px`;
    rect.style.borderColor = colors[box['class']];

    const text = document.createElement('div');
    text.className = 'text';
    text.innerText = `${box['class']} ${box['score'].toFixed(2)}`;
    text.style.color = colors[box['class']];

    rect.appendChild(text);
    rects.appendChild(rect);
  });
}

function personFound() {
  /* set the canvas to the dimensions of the video feed */
  canvas.width = webcam.videoWidth;
  canvas.height = webcam.videoHeight;
  /* make the snapshot */
  canvas.getContext('2d').drawImage(webcam, 0, 0, canvas.width, canvas.height);

  QrScanner.scanImage(canvas)
    .then(result => {
      showEnter();
      console.log('---------------!!!!WIN!!!!', result)
    })
    .catch(error => {
      showNoEntry();
      // console.log(error || 'No QR code found.')
    });
}

function showEnter() {
  var img = document.getElementById('welcome');
  img.style.visibility = 'visible';
  var img2 = document.getElementById('no-entry');
  img2.style.visibility = 'hidden';

  lockEnter = true;
  setTimeout(() => {
    lockEnter = false;
  }, 5000)
}

function showNoEntry() {
  if (lockEnter) return

  var img = document.getElementById('no-entry');
  img.style.visibility = 'visible';
  var img2 = document.getElementById('welcome');
  img2.style.visibility = 'hidden';
}

function hideAll() {
  if (lockEnter) return

  var img = document.getElementById('welcome');
  img.style.visibility = 'hidden';
  var img2 = document.getElementById('no-entry');
  img2.style.visibility = 'hidden';
}
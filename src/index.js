import $ from 'jquery';
import _ from 'lodash';
import './assets/normalize.css';
import './assets/index.css';
import 'core-js/stable';
import 'regenerator-runtime/runtime';

let siteAnalyser;
let siteWaveform;
let interpreterAnalyser;
let interpreterWaveform;

async function handleDeviceListUpdate() {
  const inputs = [new Option('Choose one as audio input', '')];
  const outputs = [new Option('Choose one as audio output', '')];
  const devices = await navigator.mediaDevices.enumerateDevices();
  _.forEach(devices, (device) => {
    const { kind, deviceId, label } = device;
    if (deviceId !== 'default' && kind === 'audioinput') {
      inputs.push(new Option(label, deviceId));
      return;
    }
    if (deviceId !== 'default' && kind === 'audiooutput') {
      outputs.push(new Option(label, deviceId));
    }
  });
  $('#site-in').empty().append(inputs);
  $('#site-out').empty().append(outputs);
  $('#interpreter-in').empty().append(inputs);
  $('#interpreter-out').empty().append(outputs);
}

async function handleSiteInChange(deviceId) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId } });
  $('#site')[0].srcObject = stream;
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const source = context.createMediaStreamSource(stream);
  siteAnalyser = context.createAnalyser();
  source.connect(siteAnalyser);
  siteAnalyser.connect(context.destination);
}

$('#site-in').on('change', async (evt) => {
  const { value } = evt.target;
  if (value === '') return;
  window.localStorage.setItem('site-in', value);
  handleSiteInChange(value);
});

async function handleSiteOutChange(deviceId) {
  $('#site')[0].setSinkId(deviceId);
}

$('#site-out').on('change', async (evt) => {
  const { value } = evt.target;
  if (value === '') return;
  window.localStorage.setItem('site-out', value);
  handleSiteOutChange();
});

async function handleInterpreterInChange(deviceId) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId } });
  $('#interpreter')[0].srcObject = stream;
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const source = context.createMediaStreamSource(stream);
  interpreterAnalyser = context.createAnalyser();
  source.connect(interpreterAnalyser);
  interpreterAnalyser.connect(context.destination);
}

$('#interpreter-in').on('change', async (evt) => {
  const { value } = evt.target;
  if (value === '') return;
  window.localStorage.setItem('interpreter-in', value);
  handleInterpreterInChange(value);
});

async function handleInterpreterOutChange(deviceId) {
  $('#interpreter')[0].setSinkId(deviceId);
}

$('#interpreter-out').on('change', async (evt) => {
  const { value } = evt.target;
  if (value === '') return;
  window.localStorage.setItem('interpreter-out', value);
  handleInterpreterOutChange(value);
});

$('mute-button').on('click', () => {
  $('#interpreter')[0].muted = true;
});

$('#interpreter')[0].addEventListener('volumechange', () => {
  console.log('changed.');
});

function frameLooper() {
  const { d3 } = window;
  if (interpreterAnalyser) {
    const waveform = new Uint8Array(interpreterAnalyser.frequencyBinCount);
    interpreterAnalyser.getByteFrequencyData(waveform);
    const binsize = 70;
    const sampling = [];
    for (let i = 0; i < 500; i += 1) {
      if (i % binsize === 0) sampling.push(waveform[i]);
    }

    const r = d3.scale.linear().domain([0, 100]).range([0, 120]);
    const bars = interpreterWaveform.selectAll('circle').data(sampling, (d) => d);
    bars.enter().append('circle')
      .attr('opacity', 0.1)
      .attr('fill', '#fff')
      .attr('cy', '50%')
      .attr('cx', '50%')
      .attr('r', (d) => r(d));
    bars.exit().remove();
  }

  if (siteAnalyser) {
    const waveform = new Uint8Array(siteAnalyser.frequencyBinCount);
    siteAnalyser.getByteFrequencyData(waveform);
    const binsize = 70;
    const sampling = [];
    for (let i = 0; i < 500; i += 1) {
      if (i % binsize === 0) sampling.push(waveform[i]);
    }
  }
  window.requestAnimationFrame(frameLooper);
}

(async () => {
  await navigator.mediaDevices.getUserMedia({ audio: true });
  handleDeviceListUpdate();
  siteWaveform = window.d3.select('.site .waveform').append('svg').attr('width', 500).attr('height', 100);
  interpreterWaveform = window.d3.select('.interpreter .waveform').append('svg').attr('width', 500).attr('height', 500);

  window.requestAnimationFrame = window.requestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.msRequestAnimationFrame;
  window.requestAnimationFrame(frameLooper);
})();

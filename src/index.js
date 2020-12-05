import $ from 'jquery';
import _ from 'lodash';
import Mousetrap from 'mousetrap';
import 'regenerator-runtime/runtime';
import './assets/normalize.css';
import './assets/index.css';
import 'core-js/stable';
import mute from './assets/microphone-mute.png';
import unmute from './assets/microphone-unmute.png';

let isMute = true;
let siteAnalyser;
let siteWaveform;
let interpreterAnalyser;
let interpreterWaveform;

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
  await $('#site')[0].setSinkId(deviceId);
  console.log(`Site played on ${deviceId}`);
}

$('#site-out').on('change', async (evt) => {
  const { value } = evt.target;
  if (value === '') return;
  window.localStorage.setItem('site-out', value);
  handleSiteOutChange(value);
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
  console.log(`Interpreter played on ${deviceId}`);
}

$('#interpreter-out').on('change', async (evt) => {
  const { value } = evt.target;
  if (value === '') return;
  window.localStorage.setItem('interpreter-out', value);
  handleInterpreterOutChange(value);
});

async function handleDeviceListUpdate() {
  const devices = await navigator.mediaDevices.enumerateDevices();

  const siteInputs = [new Option('Choose one as audio input', '')];
  const siteOutputs = [new Option('Choose one as audio output', '')];
  const siteIn = window.localStorage.getItem('site-in');
  const siteOut = window.localStorage.getItem('site-out');
  _.forEach(devices, (device) => {
    const { kind, deviceId, label } = device;
    if (deviceId !== 'default' && kind === 'audioinput') {
      siteInputs.push(new Option(label, deviceId, deviceId === siteIn, deviceId === siteIn));
      if (deviceId === siteIn) handleSiteInChange(deviceId);
      return;
    }
    if (deviceId !== 'default' && kind === 'audiooutput') {
      siteOutputs.push(new Option(label, deviceId, deviceId === siteOut, deviceId === siteOut));
      if (deviceId === siteOut) handleSiteOutChange(deviceId);
    }
  });
  $('#site-in').empty().append(siteInputs);
  $('#site-out').empty().append(siteOutputs);

  const interpreterInputs = [new Option('Choose one as audio input', '')];
  const interpreterOutputs = [new Option('Choose one as audio output', '')];
  const interpreterIn = window.localStorage.getItem('interpreter-in');
  const interpreterOut = window.localStorage.getItem('interpreter-out');
  _.forEach(devices, (device) => {
    const { kind, deviceId, label } = device;
    if (deviceId !== 'default' && kind === 'audioinput') {
      interpreterInputs.push(
        new Option(label, deviceId, deviceId === interpreterIn, deviceId === interpreterIn),
      );
      if (deviceId === interpreterIn) handleInterpreterInChange(deviceId);
      return;
    }
    if (deviceId !== 'default' && kind === 'audiooutput') {
      interpreterOutputs.push(
        new Option(label, deviceId, deviceId === interpreterOut, deviceId === interpreterOut),
      );
      if (deviceId === interpreterOut) handleInterpreterOutChange(deviceId);
    }
  });
  $('#interpreter-in').empty().append(interpreterInputs);
  $('#interpreter-out').empty().append(interpreterOutputs);
}

const handleToggleMicrophone = () => {
  isMute = !isMute;
  $('#interpreter')[0].muted = isMute;
  $('#microphone img').attr('src', isMute === true ? mute : unmute);
};

$('#microphone').on('click', () => handleToggleMicrophone());

function frameLooper() {
  const { d3 } = window;

  if (siteAnalyser) {
    const waveform = new Uint8Array(siteAnalyser.frequencyBinCount);
    siteAnalyser.getByteFrequencyData(waveform);
    const binsize = 70;
    const sampling = [];
    for (let i = 0; i < 500; i += 1) {
      if (i % binsize === 0) sampling.push(waveform[i]);
    }

    // const r = d3.scale.linear().domain([0, 100]).range([0, 120]);
    const bars = siteWaveform.selectAll('rect').data(sampling, (d) => d);
    bars.enter().append('rect')
      .attr('opacity', 0.1)
      .attr('fill', '#fff')
      .attr('height', '100%')
      .attr('width', (d) => `${d}%`)
      .attr('cy', 0)
      .attr('cx', 0);
    bars.exit().remove();
  }

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
      .attr('r', (d) => (isMute === true ? 0 : r(d)));
    bars.exit().remove();
  }

  window.requestAnimationFrame(frameLooper);
}

(async () => {
  await navigator.mediaDevices.getUserMedia({ audio: true });
  handleDeviceListUpdate();
  siteWaveform = window.d3.select('.site .waveform').append('svg').attr('width', '100%').attr('height', 20);
  interpreterWaveform = window.d3.select('.interpreter .waveform').append('svg').attr('width', '100%').attr('height', 500);

  window.requestAnimationFrame = window.requestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.msRequestAnimationFrame;
  window.requestAnimationFrame(frameLooper);

  $('#microphone img').attr('src', mute);
  $('#interpreter')[0].muted = isMute;

  Mousetrap.bind('space', () => handleToggleMicrophone());
  Mousetrap.bind('enter', () => handleToggleMicrophone());
})();

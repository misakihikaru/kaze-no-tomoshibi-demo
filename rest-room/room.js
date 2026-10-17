const body = document.body;
const image = document.querySelector('#room-image');
const scene = document.querySelector('.room-scene');
const tea = document.querySelector('.tea-target');
const light = document.querySelector('.light-target');
const steam = document.querySelector('.tea-steam');
const glow = document.querySelector('.lantern-glow');
const status = document.querySelector('#room-status');
const motionButton = document.querySelector('#motion-toggle');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
let motionEnabled = !preference.matches;
let teaAnimation;
let lightAnimation;
const active = animation => animation && ['running', 'paused', 'pending'].includes(animation.playState);

function setMotion(enabled) {
  motionEnabled = enabled;
  body.dataset.motion = enabled ? 'on' : 'off';
  motionButton.setAttribute('aria-pressed', String(!enabled));
  motionButton.querySelector('span').textContent = enabled ? '動きを止める' : '動きを再開';
  // Switching off movement also stops any steam already rising.
  teaAnimation?.cancel();
  lightAnimation?.cancel();
}
setMotion(motionEnabled);
motionButton.disabled = false;
motionButton.addEventListener('click', () => setMotion(!motionEnabled));
preference.addEventListener('change', event => setMotion(!event.matches));

function imageLoaded() {
  if (!image.naturalWidth) return imageFailed();
  body.dataset.ready = 'true';
  tea.disabled = false;
  light.disabled = false;
  setTimeout(() => body.classList.add('hint-settled'), 8500);
}
function imageFailed() {
  body.dataset.ready = 'false';
  scene.classList.add('failed');
  tea.disabled = light.disabled = true;
  document.querySelector('.room-hint').hidden = true;
  document.querySelector('.image-error').hidden = false;
}
image.addEventListener('load', imageLoaded, { once: true });
image.addEventListener('error', imageFailed, { once: true });
if (image.complete) image.naturalWidth ? imageLoaded() : imageFailed();

tea.addEventListener('click', () => {
  if (active(teaAnimation)) return;
  const moving = motionEnabled && !preference.matches;
  teaAnimation = steam.animate([
    { opacity: 0, transform: 'translateY(0)' },
    { opacity: .46, offset: .3 },
    { opacity: 0, transform: moving ? 'translateY(-16%)' : 'translateY(0)' },
  ], { duration: moving ? 4200 : 1600, easing: 'ease-in-out' });
  status.textContent = 'お茶の湯気が、ふわり。';
});
light.addEventListener('click', () => {
  if (active(lightAnimation)) return;
  lightAnimation = glow.animate([{ opacity: 0 }, { opacity: 1, offset: .36 }, { opacity: 0 }], { duration: 4200, easing: 'ease-in-out' });
  status.textContent = '灯りが、やわらかく広がります。';
});

// Audio is created only by an explicit sound selection. Nothing is fetched or stored.
class RoomSound {
  context = null;
  output = null;
  nodes = [];
  revision = 0;
  volume = .2;
  mode = 'silent';
  async select(mode) {
    const revision = ++this.revision;
    this.disconnectVoice();
    this.mode = 'silent';
    if (mode === 'silent') {
      await this.context?.suspend();
      return this.mode;
    }
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('Audio unavailable');
    if (!this.context || this.context.state === 'closed') {
      this.context = new Audio();
      this.output = this.context.createGain();
      this.output.gain.value = 0;
      this.output.connect(this.context.destination);
    }
    await this.context.resume();
    if (revision !== this.revision || document.hidden) return 'silent';
    if (this.context.state !== 'running') throw new Error('Audio could not start');
    const ctx = this.context;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 5, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      brown = (brown + .02 * white) / 1.02;
      data[i] = mode === 'wind' ? brown * 3.5 : white * .36;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass'; low.frequency.value = mode === 'wind' ? 850 : 4200;
    const high = ctx.createBiquadFilter();
    high.type = 'highpass'; high.frequency.value = mode === 'wind' ? 80 : 650;
    source.connect(low).connect(high).connect(this.output);
    this.nodes = [source, low, high];
    source.start();
    this.mode = mode;
    this.output.gain.cancelScheduledValues(ctx.currentTime);
    this.output.gain.setValueAtTime(0, ctx.currentTime);
    this.output.gain.linearRampToValueAtTime(this.volume * .32, ctx.currentTime + 1.4);
    return mode;
  }
  disconnectVoice() {
    if (this.output) {
      this.output.gain.cancelScheduledValues(this.context.currentTime);
      this.output.gain.value = 0;
    }
    for (const node of this.nodes) { if (node.stop) { try { node.stop(); } catch {} } node.disconnect(); }
    this.nodes = [];
  }
  setVolume(value) {
    this.volume = Math.max(0, Math.min(.6, value));
    if (this.output && this.context.state === 'running') this.output.gain.setTargetAtTime(this.volume * .32, this.context.currentTime, .15);
  }
  stop() {
    ++this.revision;
    this.disconnectVoice();
    this.mode = 'silent';
    this.context?.suspend().catch(() => {});
  }
  close() {
    this.stop();
    this.context?.close().catch(() => {});
    this.context = null;
    this.output = null;
  }
}
const sound = new RoomSound();
const soundToggle = document.querySelector('#sound-toggle');
const panel = document.querySelector('#sound-panel');
const choices = [...document.querySelectorAll('[data-sound]')];
let soundRequest = 0;
function renderSound(mode) {
  const label = { silent: '無音', wind: '夜風', rain: '雨' }[mode];
  soundToggle.querySelector('.sound-state').textContent = label;
  choices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.sound === mode)));
}
function closePanel(restoreFocus = false) {
  panel.hidden = true;
  soundToggle.setAttribute('aria-expanded', 'false');
  if (restoreFocus) soundToggle.focus();
}
soundToggle.disabled = false;
soundToggle.addEventListener('click', () => {
  panel.hidden = !panel.hidden;
  soundToggle.setAttribute('aria-expanded', String(!panel.hidden));
  if (!panel.hidden) panel.querySelector('[aria-pressed="true"]').focus();
});
choices.forEach(button => button.addEventListener('click', async () => {
  const request = ++soundRequest;
  // During a switch the old voice has stopped; never claim it is still playing.
  renderSound('silent');
  try {
    const mode = await sound.select(button.dataset.sound);
    if (request !== soundRequest) return;
    renderSound(mode);
    status.textContent = mode === 'silent' ? '音を止めました。' : `${mode === 'wind' ? '夜風' : '雨'}を模した合成音です。`;
  } catch {
    if (request !== soundRequest) return;
    sound.stop(); renderSound('silent');
    status.textContent = 'この環境では音を再生できませんでした。無音でお楽しみください。';
  }
}));
document.querySelector('#volume').addEventListener('input', event => sound.setVolume(Number(event.target.value) / 100));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) closePanel(true); });
document.addEventListener('pointerdown', event => { if (!panel.hidden && !event.target.closest('.sound-settings')) closePanel(); });
document.addEventListener('focusin', event => { if (!panel.hidden && !event.target.closest('.sound-settings')) closePanel(); });
function stopSound() { ++soundRequest; sound.stop(); renderSound('silent'); }
document.addEventListener('visibilitychange', () => {
  body.dataset.paused = String(document.hidden);
  for (const animation of [teaAnimation, lightAnimation]) {
    if (active(animation)) document.hidden ? animation.pause() : animation.play();
  }
  // Returning to a tab remains silent until the visitor chooses a sound again.
  if (document.hidden) stopSound();
});
window.addEventListener('pagehide', () => { stopSound(); sound.close(); teaAnimation?.cancel(); lightAnimation?.cancel(); });
window.addEventListener('pageshow', () => { body.dataset.paused = String(document.hidden); renderSound('silent'); });

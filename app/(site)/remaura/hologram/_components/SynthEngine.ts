export class SynthEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private beatCallback: ((value: number) => void) | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;

  public init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);
    }
  }

  public setBeatCallback(callback: (value: number) => void) {
    this.beatCallback = callback;
  }

  public setVolume(volume: number) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(volume * 0.5, this.ctx.currentTime);
    }
  }

  public async startMic() {
    this.init();
    if (!this.ctx || !this.analyser) return false;
    try {
      this.stop();
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.micSource = this.ctx.createMediaStreamSource(this.micStream);
      this.micSource.connect(this.analyser);
      this.isPlaying = true;
      this.startAnalyserLoop();
      return true;
    } catch {
      return false;
    }
  }

  public stopMic() {
    if (this.micStream) { this.micStream.getTracks().forEach(t => t.stop()); this.micStream = null; }
    if (this.micSource) { this.micSource.disconnect(); this.micSource = null; }
  }

  public playSynth() {
    this.init();
    if (!this.ctx || !this.gainNode || !this.analyser) return;
    this.stop();
    this.isPlaying = true;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.analyser.connect(this.gainNode);

    let beatCount = 0;
    const tempo = 120;
    const stepDuration = 60 / tempo / 2;

    const playStep = () => {
      if (!this.ctx || !this.analyser || !this.isPlaying) return;
      const time = this.ctx.currentTime;
      const isKick = beatCount % 4 === 0;
      const isHihat = beatCount % 4 === 2;
      const isSynth = beatCount % 8 === 1 || beatCount % 8 === 4 || beatCount % 8 === 6;

      if (isKick) {
        const ko = this.ctx.createOscillator();
        const kg = this.ctx.createGain();
        ko.frequency.setValueAtTime(150, time);
        ko.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);
        kg.gain.setValueAtTime(1.0, time);
        kg.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        ko.connect(kg); kg.connect(this.analyser);
        ko.start(time); ko.stop(time + 0.3);
      }
      if (isHihat) {
        const ho = this.ctx.createOscillator();
        const hg = this.ctx.createGain();
        ho.type = 'triangle'; ho.frequency.setValueAtTime(8000, time);
        hg.gain.setValueAtTime(0.15, time); hg.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        ho.connect(hg); hg.connect(this.analyser);
        ho.start(time); ho.stop(time + 0.06);
      }
      if (isSynth) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const notes = [110, 130.81, 146.83, 164.81, 196.00, 220.00];
        const pitch = notes[Math.floor(Math.sin(beatCount * 0.5) * 3 + 3) % notes.length];
        o.type = Math.random() > 0.5 ? 'sawtooth' : 'triangle';
        o.frequency.setValueAtTime(pitch, time);
        o.frequency.exponentialRampToValueAtTime(pitch * 2, time + 0.15);
        g.gain.setValueAtTime(0.4, time); g.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        o.connect(g); g.connect(this.analyser);
        o.start(time); o.stop(time + 0.25);
      }
      beatCount++;
    };

    this.intervalId = setInterval(playStep, stepDuration * 1000);
    this.startAnalyserLoop();
  }

  private startAnalyserLoop() {
    if (!this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    const check = () => {
      if (!this.isPlaying || !this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      if (this.beatCallback) this.beatCallback(sum / dataArray.length / 255);
      requestAnimationFrame(check);
    };
    check();
  }

  public stop() {
    this.isPlaying = false;
    this.stopMic();
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
  }
}

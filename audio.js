/* Small synthesized dojo sound effects. No downloads or external audio files. */
(function(root){
  'use strict';
  class Sound {
    constructor(){
      this.utterance=null;
      this.context=null;this.master=null;this.voices=new Set();this.paused=false;
      this.lastError=null;
      this.supported=Boolean(root.AudioContext||root.webkitAudioContext);this.enabled=true;
      try{this.enabled=root.localStorage.getItem('donggulbari-sound')!=='off';}catch(_){/* Private mode may block storage. */}
    }
    unlock(){
      if(!this.supported||!this.enabled)return Promise.resolve();
      try{
        if(!this.context || this.context.state==='closed'){
          const Context=root.AudioContext||root.webkitAudioContext;this.context=new Context();
          this.master=this.context.createGain();this.master.gain.value=.4;
          const limiter=this.context.createDynamicsCompressor();
          limiter.threshold.value=-15;limiter.knee.value=12;limiter.ratio.value=8;
          this.master.connect(limiter);limiter.connect(this.context.destination);
        }
        // Prime the hardware synchronously during the gesture (older iOS WebKit).
        const primer=this.context.createBufferSource();
        primer.buffer=this.context.createBuffer(1,1,this.context.sampleRate);
        primer.connect(this.master);primer.onended=()=>primer.disconnect();primer.start(0);
        try{if(root.navigator?.audioSession)root.navigator.audioSession.type='playback';}catch(_){}
        this.lastError=null;
        // Safari can report 'interrupted' after an app switch or phone call.
        if(this.context.state!=='running')return this.context.resume().catch(error=>{this.lastError=error.name;});
      }catch(error){this.lastError=error.name;this.stop();}
      return Promise.resolve();
    }
    setEnabled(enabled){
      this.enabled=enabled;
      try{root.localStorage.setItem('donggulbari-sound',enabled?'on':'off');}catch(_){}
      if(!enabled)this.stop();
    }
    setPaused(paused){this.paused=paused;if(paused)this.stop();}
    speak(text){
      if(!this.enabled||this.paused||!root.speechSynthesis||!root.SpeechSynthesisUtterance)return;
      const voices=root.speechSynthesis.getVoices();
      const voice=voices.find(v=>v.lang.startsWith('ko')&&v.localService)||voices.find(v=>v.lang.startsWith('ko'));
      if(!voice)return; // Text and fanfare still introduce the fighters without a Korean voice.
      this.stopSpeech();
      const utterance=new root.SpeechSynthesisUtterance(text);
      utterance.lang='ko-KR';utterance.voice=voice;utterance.rate=1.12;utterance.volume=.85;
      this.utterance=utterance;
      utterance.onend=()=>{if(this.utterance===utterance)this.utterance=null;};
      root.speechSynthesis.speak(utterance);
    }
    stopSpeech(){if(this.utterance){root.speechSynthesis.cancel();this.utterance=null;}}
    stop(){
      this.stopSpeech();
      for(const voice of this.voices){try{voice.stop();}catch(_){}voice.disconnect();}
      this.voices.clear();
    }
    tone(frequency,duration,delay=0,type='sine',volume=.3,endFrequency=frequency){
      const c=this.context,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();
      o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),t+duration);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+duration);
      o.connect(g);g.connect(this.master);this.track(o,g);o.start(t);o.stop(t+duration+.02);
    }
    noise(duration,delay=0,volume=.25,frequency=800){
      const c=this.context,t=c.currentTime+delay,buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate);
      const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      const source=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain();
      source.buffer=buffer;filter.type='lowpass';filter.frequency.value=frequency;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+duration);
      source.connect(filter);filter.connect(g);g.connect(this.master);this.track(source,g,filter);source.start(t);source.stop(t+duration+.02);
    }
    track(source,...nodes){
      this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();nodes.forEach(n=>n.disconnect());};
    }
    play(name,preview=false){
      if(!this.enabled||!this.supported||(this.paused&&!preview)||!this.context||this.context.state!=='running')return;
      switch(name){
        case 'announce': this.tone(196,.2,0,'triangle',.25);this.tone(294,.24,.14,'triangle',.25);this.noise(.7,.1,.08,1200);break;
        case 'bell': this.tone(880,.5,0,'sine',.4);this.tone(1320,.55,0,'sine',.16);break;
        case 'move': this.noise(.18,0,.16,1300);break;
        case 'mat': this.tone(115,.22,0,'sine',.6,42);this.noise(.14,0,.35,500);break;
        case 'position': this.noise(.13,0,.15,700);this.tone(440,.12,.02,'triangle',.18,660);break;
        case 'block': this.noise(.12,0,.25,1000);this.tone(190,.14,0,'triangle',.2,125);break;
        case 'recover': this.tone(392,.16,0,'sine',.2);this.tone(523,.22,.12,'sine',.2);break;
        case 'lock': this.tone(230,.16,0,'sine',.16,310);break;
        case 'tap': for(let i=0;i<3;i++){this.noise(.06,i*.12,.35,800);this.tone(170,.06,i*.12,'sine',.25,95);}break;
        case 'win': [523,659,784,1047].forEach((f,i)=>this.tone(f,.3,i*.13,'triangle',.23));break;
        case 'champion': [523,659,784,1047,784,1047].forEach((f,i)=>this.tone(f,.42,i*.16,'triangle',.24));this.noise(.9,.18,.1,1700);break;
        case 'loss': this.tone(330,.3,0,'triangle',.18);this.tone(220,.45,.2,'triangle',.18);break;
        case 'draw': this.tone(440,.2,0,'sine',.2);this.tone(440,.3,.25,'sine',.2);break;
      }
    }
  }
  root.JiuJitsuSound=Sound;
})(typeof globalThis!=='undefined'?globalThis:this);

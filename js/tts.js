// 语音合成模块 (Web Speech API)
const TTS = {
  synth: window.speechSynthesis,
  voice: null,

  // 初始化：获取美式英语语音
  init() {
    if (!this.synth) {
      console.warn('Web Speech API is not supported in this browser.');
      return;
    }
    // 延迟获取语音列表（某些浏览器需要异步加载）
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      // 优先选择美式英语女声
      this.voice = voices.find(v =>
        v.lang === 'en-US' && v.name.includes('Female')
      ) || voices.find(v =>
        v.lang === 'en-US'
      ) || voices.find(v =>
        v.lang.startsWith('en-')
      ) || voices[0];
    };
    loadVoices();
    this.synth.onvoiceschanged = loadVoices;
  },

  // 朗读文本
  speak(text, rate) {
    return new Promise((resolve) => {
      if (!this.synth) {
        resolve();
        return;
      }
      // 取消正在播放的语音
      this.synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = this.voice;
      utterance.rate = rate || 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = 'en-US';
      utterance.onend = resolve;
      utterance.onerror = resolve;
      this.synth.speak(utterance);
    });
  },

  // 朗读单词
  speakWord(word, rate) {
    return this.speak(word, rate);
  },

  // 朗读例句
  speakExample(sentence, rate) {
    return this.speak(sentence, rate || 0.85);
  }
};

// 初始化语音模块
TTS.init();

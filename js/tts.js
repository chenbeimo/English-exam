// 语音合成模块 (Web Speech API)
const TTS = {
  synth: null,
  voice: null,
  voicesLoaded: false,

  // 初始化
  init() {
    this.synth = window.speechSynthesis;
    if (!this.synth) {
      console.warn('Web Speech API is not supported in this browser.');
      return;
    }
    // 移动端 Safari 需要先加载声音列表
    this.loadVoices();
    // 部分浏览器异步加载语音
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
  },

  // 加载并选择合适的语音
  loadVoices() {
    const voices = this.synth.getVoices();
    if (voices.length === 0) return;
    this.voicesLoaded = true;
    // iOS 优先匹配 en-US（Samantha, Karen 等），Android/桌面优先 Female
    this.voice = voices.find(v =>
      v.lang === 'en-US' && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Karen'))
    ) || voices.find(v =>
      v.lang === 'en-US'
    ) || voices.find(v =>
      v.lang.startsWith('en-')
    ) || voices[0];
  },

  // 确保语音可用（移动端首次交互后加载）
  ensureVoice() {
    if (!this.voice || !this.voicesLoaded) {
      this.loadVoices();
    }
    // 如果仍然没有语音，尝试重新获取
    if (!this.voice) {
      const voices = this.synth.getVoices();
      if (voices.length > 0) {
        this.voicesLoaded = true;
        this.voice = voices.find(v => v.lang === 'en-US') || voices.find(v => v.lang.startsWith('en-')) || voices[0];
      }
    }
  },

  // 朗读文本（必须在用户手势事件中直接调用）
  speak(text, rate) {
    return new Promise((resolve) => {
      if (!this.synth) {
        resolve();
        return;
      }
      this.ensureVoice();
      // 移动端必须先 cancel 再 speak（Safari 要求）
      this.synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.voice) utterance.voice = this.voice;
      utterance.rate = rate || 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = 'en-US';
      utterance.onend = resolve;
      utterance.onerror = () => {
        // iOS 偶尔会抛 "interrupted" 错误，静默处理
        resolve();
      };
      this.synth.speak(utterance);
    });
  },

  speakWord(word, rate) {
    return this.speak(word, rate);
  },

  speakExample(sentence, rate) {
    return this.speak(sentence, rate || 0.85);
  }
};

TTS.init();

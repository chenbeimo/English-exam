// 语音模块 — 使用有道词典在线发音 API
const TTS = {
  // 有道 API: type=0 美式, type=1 英式
  baseUrl: 'https://dict.youdao.com/dictvoice',

  // 当前音频元素
  audio: null,

  // 播放单词发音
  speakWord(word) {
    return this._playAudio(word, 0);
  },

  // 播放例句（有道 TTS 支持短语）
  speakExample(sentence) {
    return this._playAudio(sentence, 0);
  },

  // 兼容旧接口
  speak(text, rate) {
    return this._playAudio(text, 0);
  },

  // 内部播放方法
  _playAudio(text, type) {
    return new Promise((resolve) => {
      // 停止上一个音频
      if (this.audio) {
        this.audio.pause();
        this.audio = null;
      }

      const word = encodeURIComponent(text.trim());
      const url = `${this.baseUrl}?audio=${word}&type=${type}`;

      const audio = new Audio();
      audio.src = url;
      audio.volume = 1;
      this.audio = audio;

      audio.onended = () => {
        this.audio = null;
        resolve();
      };

      audio.onerror = () => {
        // 有道 API 偶尔失败，静默处理
        this.audio = null;
        resolve();
      };

      audio.play().catch(() => {
        // 移动端自动播放可能被拦截，但这里是由用户点击触发的，通常不会
        resolve();
      });
    });
  },

  // 无操作，保留接口兼容性
  init() {},
  ensureVoice() {},
  loadVoices() {}
};

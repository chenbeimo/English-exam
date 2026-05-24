// ===== 修改位置：语音模块（音频解锁 + 多级降级） =====
// 策略：原生 Web Speech API TTS → 有道在线 API → 百度在线 API
const TTS = {
  unlocked: false,
  nativeAvailable: false,
  nativeVoice: null,
  currentAudio: null,

  // 无声音频 Base64（解锁 AudioContext 用）
  SILENT_AUDIO: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',

  // ===== 初始化：检测原生 TTS 是否可用 =====
  init() {
    if (!('speechSynthesis' in window)) return;
    var synth = window.speechSynthesis;
    var self = this;
    var loadVoices = function () {
      var voices = synth.getVoices();
      if (voices.length > 0) {
        var en = voices.find(function (v) { return v.lang === 'en-US'; })
          || voices.find(function (v) { return v.lang.indexOf('en-') === 0; });
        if (en) {
          self.nativeAvailable = true;
          self.nativeVoice = en;
        }
      }
    };
    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
  },

  // ===== 解锁：在用户点击事件中同步调用 =====
  unlock: function () {
    // 1) 播放无声音频，解锁 HTML Audio 上下文
    var sa = new Audio(this.SILENT_AUDIO);
    sa.volume = 0.01;
    sa.play().catch(function () {});

    // 2) 解锁 Web Speech API
    if ('speechSynthesis' in window) {
      var synth = window.speechSynthesis;
      var voices = synth.getVoices();
      if (voices.length > 0) {
        var en = voices.find(function (v) { return v.lang === 'en-US'; })
          || voices.find(function (v) { return v.lang.indexOf('en-') === 0; });
        if (en) {
          this.nativeAvailable = true;
          this.nativeVoice = en;
        }
      }
      var u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      u.rate = 2;
      synth.speak(u);
    }

    this.unlocked = true;
  },

  // ===== 发音主入口（美式） =====
  speakWord: function (word) {
    if (!this.unlocked) {
      this.unlock();
    }
    this._speak(word);
  },

  speakExample: function (sentence) {
    this.speakWord(sentence);
  },

  speak: function (text) {
    this.speakWord(text);
  },

  // ===== 内部发音逻辑 =====
  _speak: function (word) {
    var self = this;
    var text = word.trim();
    var used = false;

    // 优先尝试原生 TTS
    if (this.nativeAvailable && 'speechSynthesis' in window) {
      var synth = window.speechSynthesis;
      synth.cancel();

      // 重新确认语音对象有效
      var voices = synth.getVoices();
      var voice = voices.find(function (v) { return v.lang === 'en-US'; })
        || voices.find(function (v) { return v.lang.indexOf('en-') === 0; });
      if (voice) {
        this.nativeVoice = voice;
        var u = new SpeechSynthesisUtterance(text);
        u.voice = voice;
        u.lang = 'en-US';
        u.rate = 0.9;
        u.volume = 1;

        var resolved = false;
        u.onend = function () { resolved = true; };
        u.onerror = function () {
          resolved = true;
          if (!used) { used = true; self._playOnline(text); }
        };
        synth.speak(u);

        // 300ms 检测：若未被触发，可能被浏览器静音 → 降级
        setTimeout(function () {
          if (!resolved && !used) {
            synth.cancel();
            used = true;
            self._playOnline(text);
          }
        }, 300);
        return;
      }
    }

    // 原生不可用 → 在线 API
    this._playOnline(text);
  },

  // ===== 在线 API 降级：有道 → 百度 =====
  // 【关键】两个 Audio 对象在同步调用栈中创建
  _playOnline: function (text) {
    var word = encodeURIComponent(text);
    var youdaoUrl = 'https://dict.youdao.com/dictvoice?audio=' + word + '&type=0';
    var baiduUrl = 'https://fanyi.baidu.com/gettts?lan=en&text=' + word + '&spd=3&source=web';

    // 同步创建两个 Audio
    var youdaoAudio = new Audio(youdaoUrl);
    var baiduAudio = new Audio(baiduUrl);

    // 停止旧音频
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    var played = false;
    var doBaidu = function () {
      if (played) return;
      played = true;
      this.currentAudio = baiduAudio;
      baiduAudio.volume = 1;
      baiduAudio.play().catch(function () {});
    }.bind(this);

    // 2秒超时
    var timer = setTimeout(function () {
      if (!played) {
        played = true;
        this.currentAudio = baiduAudio;
        baiduAudio.volume = 1;
        baiduAudio.play().catch(function () {});
      }
    }.bind(this), 2000);

    youdaoAudio.oncanplaythrough = function () {
      clearTimeout(timer);
    };
    youdaoAudio.onerror = function () {
      clearTimeout(timer);
      doBaidu();
    };

    this.currentAudio = youdaoAudio;
    youdaoAudio.volume = 1;
    youdaoAudio.play().catch(function () {
      clearTimeout(timer);
      doBaidu();
    });
  },

  ensureVoice: function () {},
  loadVoices: function () {}
};

TTS.init();

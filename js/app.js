j'x// 主应用逻辑
const App = {
  // ===== 状态 =====
  state: {
    mode: 'home',
    level: 'college',
    grade: 'core',
    currentIndex: 0,
    dailyWords: [],
    quizWords: [],
    quizIndex: 0,
    quizCorrect: 0,
    spellWords: [],
    spellIndex: 0,
    spellCorrect: 0,
    isQuizAnswered: false,
    isSpellAnswered: false
  },

  // ===== 初始化 =====
  init() {
    const settings = Storage.getSettings();
    this.state.level = settings.level || 'college';
    this.state.grade = settings.grade || 'core';
    this.applyTheme(settings.theme || 'auto');

    // 预加载当前学段词库
    loadLevelData(this.state.level).catch(function () {});

    // ===== 修改位置：检查音频解锁状态 =====
    var audioUnlocked = localStorage.getItem('vocab_audio_unlocked') === '1';
    if (!audioUnlocked) {
      this.showAudioLock();
    } else {
      // 返回用户：恢复解锁状态
      document.getElementById('audioLockOverlay').style.display = 'none';
      TTS.unlocked = true;
      TTS.init();
      this.bindEvents();
      this.navigate('home');
    }
  },

  // ===== 修改位置：显示音频解锁遮罩 =====
  showAudioLock: function () {
    var overlay = document.getElementById('audioLockOverlay');
    var self = this;
    overlay.style.display = 'flex';

    var handler = function () {
      localStorage.setItem('vocab_audio_unlocked', '1');
      overlay.style.display = 'none';
      overlay.removeEventListener('click', handler);
      try { TTS.unlock(); } catch (e) {}
      self.bindEvents();
      self.navigate('home');
    };

    overlay.addEventListener('click', handler);
  },

  // ===== 事件绑定 =====
  bindEvents() {
    // 底部导航
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const nav = btn.dataset.nav;
        if (nav === 'review') {
          this.navigate('review');
        } else if (nav === 'wordbook') {
          this.navigate('wordbook');
        } else if (nav === 'spell') {
          this.startSpell();
        } else if (nav === 'learn') {
          this.startLearn();
        } else if (nav === 'quiz') {
          this.startQuiz();
        } else {
          this.navigate(nav);
        }
      });
    });

    // 首页学段切换
    var self = this;
    document.querySelectorAll('.level-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.level-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        self.setLevel(btn.dataset.level);
      });
    });
    // 年级/分类切换（委托）
    document.getElementById('gradeSwitch').addEventListener('click', function (e) {
      var btn = e.target.closest('.grade-btn');
      if (!btn) return;
      document.querySelectorAll('.grade-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      self.state.grade = btn.dataset.grade;
      Storage.saveSettings({ level: self.state.level, grade: self.state.grade });
      self.renderHome();
    });

    // 首页快捷入口（不含底部导航按钮）
    document.querySelectorAll('#mainContent [data-nav], .home-actions [data-nav]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (e.target.closest('.level-btn, .grade-btn')) return;
        const nav = btn.dataset.nav;
        if (nav === 'review') this.navigate('review');
        else if (nav === 'wordbook') this.navigate('wordbook');
        else if (nav === 'learn') this.startLearn();
        else if (nav === 'quiz') this.startQuiz();
        else if (nav === 'spell') this.startSpell();
      });
    });

    // 学习模式按钮
    document.getElementById('btnKnow').addEventListener('click', () => this.handleKnow(true));
    document.getElementById('btnDontKnow').addEventListener('click', () => this.handleKnow(false));
    document.getElementById('learnCard').addEventListener('click', () => {
      const card = document.getElementById('learnCard');
      if (card.dataset.swiped) return; // 滑动后不触发翻转
      card.classList.toggle('flipped');
      if (card.classList.contains('flipped')) {
        Quiz.playSound('flip');
      }
    });
    // 滑动手势
    this.initSwipeGesture();
    document.getElementById('learnSpeakBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      const word = this.state.dailyWords[this.state.currentIndex];
      if (word) TTS.speakWord(word.word, Storage.getSettings().speechRate);
    });

    // 测验模式
    document.getElementById('quizSpeakBtn').addEventListener('click', () => {
      const word = this.state.quizWords[this.state.quizIndex];
      if (word) TTS.speakWord(word.word, Storage.getSettings().speechRate);
    });

    // 拼写模式
    document.getElementById('spellSpeakBtn').addEventListener('click', () => {
      const word = this.state.spellWords[this.state.spellIndex];
      if (word) TTS.speakWord(word.word, Storage.getSettings().speechRate);
    });
    document.getElementById('spellSubmit').addEventListener('click', () => this.handleSpellSubmit());
    document.getElementById('spellInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleSpellSubmit();
    });

    // 设置
    document.getElementById('btnSettings').addEventListener('click', () => this.openSettings());
    document.getElementById('btnCloseSettings').addEventListener('click', () => this.closeSettings());
    document.getElementById('settingsOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'settingsOverlay') this.closeSettings();
    });
    document.getElementById('settingRate').addEventListener('input', (e) => {
      document.getElementById('settingRateVal').textContent = e.target.value;
    });
    document.getElementById('btnResetData').addEventListener('click', () => {
      if (confirm('确定要重置所有学习进度吗？此操作不可恢复。')) {
        Storage.resetAll();
        this.closeSettings();
        this.showToast('进度已重置');
        this.navigate('home');
      }
    });
    // 主题切换
    var self = this;
    document.querySelectorAll('.theme-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.theme-opt').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var theme = btn.dataset.theme;
        self.applyTheme(theme);
        Storage.saveSettings({ theme: theme });
      });
    });
  },

  // ===== 导航 =====
  navigate(mode) {
    this.state.mode = mode;
    // 隐藏所有视图
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const view = document.getElementById(`view-${mode}`);
    if (view) view.style.display = 'block';
    // 更新导航栏
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.nav === mode ||
        (mode === 'spell' && b.dataset.nav === 'spell') ||
        (mode === 'learn' && b.dataset.nav === 'learn') ||
        (mode === 'quiz' && b.dataset.nav === 'quiz'));
    });
    // 更新标题
    const titles = {
      home: '无道词典', learn: '学习模式', quiz: '测验模式',
      review: '错题复习', wordbook: '单词本', spell: '拼写模式'
    };
    document.getElementById('pageTitle').textContent = titles[mode] || '无道词典';
    // 渲染对应视图
    switch (mode) {
      case 'home': this.renderHome(); break;
      case 'review': this.renderReview(); break;
      case 'wordbook': this.renderWordbook(); break;
    }
  },

  // ===== 首页渲染 =====
  renderHome() {
    const daily = Storage.getDailyProgress();
    const stats = Storage.getStats();
    const settings = Storage.getSettings();
    const streak = Storage.getStreakDays();
    const accuracy = stats.totalAttempts > 0
      ? Math.round((stats.totalCorrect / stats.totalAttempts) * 100) : 0;

    this.countUp('learnedCount', daily.learned);
    this.countUp('streakDays', streak);
    this.countUpTo('accuracyRate', accuracy, '%');
    this.countUp('totalLearned', stats.totalLearned);
    this.countUp('wrongCount', Storage.getWrongWords().length);
    this.countUp('bookCount', Storage.getWordbook().length);

    // 更新圆形进度
    const circle = document.getElementById('progressCircle');
    const circumference = 2 * Math.PI * 52; // ~326.73
    const ratio = Math.min(daily.learned / settings.dailyGoal, 1);
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = circumference * (1 - ratio);

    // 更新学段按钮
    document.querySelectorAll('.level-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.level === this.state.level);
    }.bind(this));
    // 渲染年级/分类按钮
    this.renderGradeSwitch();

    // 自动打卡
    Storage.checkin();
  },

  // ===== 学段/年级切换 =====
  setLevel: function (level) {
    this.state.level = level;
    var defaults = { college: 'core', primary: 'grade1', junior: 'grade7', senior: 'grade10' };
    this.state.grade = defaults[level] || 'core';
    Storage.saveSettings({ level: this.state.level, grade: this.state.grade });
    loadLevelData(level).catch(function () {});
    this.renderHome();
  },

  renderGradeSwitch: function () {
    var container = document.getElementById('gradeSwitch');
    var level = this.state.level;
    var html = '';
    if (level === 'college') {
      html = '<button class="grade-btn" data-grade="core">核心高频词</button>'
        + '<button class="grade-btn" data-grade="advanced">进阶词汇</button>';
    } else {
      var levelData = wordDB[level];
      if (levelData && levelData.grades) {
        var grades = levelData.grades;
        for (var gk in grades) {
          var gname = grades[gk].name;
          html += '<button class="grade-btn" data-grade="' + gk + '">' + gname + '</button>';
        }
      }
    }
    container.innerHTML = html;
    // 高亮当前年级
    var self = this;
    container.querySelectorAll('.grade-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.grade === self.state.grade);
    });
  },

  // ===== 学习模式 =====
  startLearn() {
    if (this.state.mode === 'learn' && this.state.dailyWords.length > 0) {
      this.navigate('learn');
      this.renderLearnCard();
      return;
    }
    var self = this;
    loadLevelData(this.state.level).then(function () {
      var all = getAllWords(self.state.level, self.state.grade);
      if (all.length === 0) {
        self.showToast('词库为空');
        return;
      }
      self.state.dailyWords = Quiz.shuffle(all);
      self.state.currentIndex = 0;
      self.navigate('learn');
      self.renderLearnCard();
    });
  },

  renderLearnCard() {
    const word = this.state.dailyWords[this.state.currentIndex];
    if (!word) {
      this.showToast('今日学习已完成！');
      this.navigate('home');
      return;
    }
    document.getElementById('learnWord').textContent = word.word;
    document.getElementById('learnPhonetic').textContent = word.phonetic;
    document.getElementById('learnMeaning').textContent = word.meaning;
    document.getElementById('learnExample').textContent = word.example;
    document.getElementById('learnExampleCn').textContent = word.exampleCn;
    // 重置卡片翻转
    document.getElementById('learnCard').classList.remove('flipped');
    // 更新进度条
    const total = this.state.dailyWords.length;
    const current = this.state.currentIndex + 1;
    document.getElementById('learnProgressText').textContent = `${current} / ${total}`;
    document.getElementById('learnProgressBar').style.width = `${(current / total) * 100}%`;
    // 移动端需要用户主动点击才能发音，提示用户点击发音按钮
  },

  handleKnow(know) {
    const word = this.state.dailyWords[this.state.currentIndex];
    if (!word) return;
    const daily = Storage.getDailyProgress();
    if (!know) {
      Storage.addWrongWord(word.id);
    }
    Storage.saveDailyProgress({
      learned: daily.learned + 1,
      correct: daily.correct + (know ? 1 : 0),
      total: daily.total + 1
    });

    const stats = Storage.getStats();
    Storage.saveStats({
      totalLearned: stats.totalLearned + 1,
      totalCorrect: stats.totalCorrect + (know ? 1 : 0),
      totalAttempts: stats.totalAttempts + 1
    });

    this.state.currentIndex++;
    if (this.state.currentIndex >= this.state.dailyWords.length) {
      const settings = Storage.getSettings();
      if (daily.learned + 1 >= settings.dailyGoal) {
        this.showToast('🎉 今日目标达成！');
      } else {
        this.showToast('本组单词学习完毕');
      }
      this.navigate('home');
    } else {
      this.renderLearnCard();
    }
  },

  // ===== 滑动手势（学习卡片） =====
  initSwipeGesture: function () {
    var el = document.getElementById('learnCard');
    var self = this;
    var startX = 0, startY = 0, dx = 0, swiping = false, locked = false;
    var THRESHOLD = 80;

    el.addEventListener('touchstart', function (e) {
      if (self.state.mode !== 'learn') return;
      var t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      dx = 0;
      swiping = false;
      locked = false;
      el.dataset.swiped = '';
    }, { passive: true });

    el.addEventListener('touchmove', function (e) {
      if (self.state.mode !== 'learn' || locked) return;
      var t = e.touches[0];
      var deltaX = t.clientX - startX;
      var deltaY = t.clientY - startY;
      // 水平滑动为主时才处理
      if (!swiping && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        swiping = true;
        el.classList.add('swiping');
      }
      if (!swiping) return;
      e.preventDefault();
      dx = deltaX;
      var inner = el.querySelector('.card-inner');
      var rotate = dx * 0.05;
      inner.style.transform = 'translateX(' + dx + 'px) rotate(' + rotate + 'deg)';
      // 显示指示器
      if (dx > 30) {
        el.classList.add('swipe-right');
        el.classList.remove('swipe-left');
      } else if (dx < -30) {
        el.classList.add('swipe-left');
        el.classList.remove('swipe-right');
      } else {
        el.classList.remove('swipe-left', 'swipe-right');
      }
    }, { passive: false });

    el.addEventListener('touchend', function () {
      if (self.state.mode !== 'learn' || !swiping) {
        el.dataset.swiped = '';
        return;
      }
      locked = true;
      el.classList.remove('swiping', 'swipe-left', 'swipe-right');
      var inner = el.querySelector('.card-inner');

      if (Math.abs(dx) >= THRESHOLD) {
        // 飞出
        var know = dx > 0;
        el.classList.add(know ? 'fly-right' : 'fly-left');
        el.dataset.swiped = '1';
        setTimeout(function () {
          el.classList.remove('fly-right', 'fly-left');
          inner.style.transform = '';
          el.classList.add('enter');
          self.handleKnow(know);
          setTimeout(function () { el.classList.remove('enter'); }, 300);
        }, 300);
      } else {
        // 弹回
        inner.style.transition = 'transform 0.25s cubic-bezier(0, 0, 0.2, 1)';
        inner.style.transform = '';
        setTimeout(function () {
          inner.style.transition = '';
          el.dataset.swiped = '';
        }, 250);
      }
    }, { passive: true });
  },

  // ===== 测验模式 =====
  startQuiz() {
    var self = this;
    loadLevelData(this.state.level).then(function () {
      var all = getAllWords(self.state.level, self.state.grade);
      if (all.length < 4) {
        self.showToast('词库单词不足，至少需要4个');
        return;
      }
      self.state.quizWords = Quiz.shuffle(all);
      self.state.quizIndex = 0;
      self.state.quizCorrect = 0;
      self.state.isQuizAnswered = false;
      self.navigate('quiz');
      self.renderQuizCard();
    });
  },

  renderQuizCard() {
    const word = this.state.quizWords[this.state.quizIndex];
    if (!word) {
      this.finishQuiz();
      return;
    }
    this.state.isQuizAnswered = false;
    document.getElementById('quizWord').textContent = word.word;
    document.getElementById('quizProgress').textContent =
      `第 ${this.state.quizIndex + 1} 题`;
    document.getElementById('quizScore').textContent =
      `正确: ${this.state.quizCorrect}`;
    document.getElementById('quizFeedback').style.display = 'none';

    const pool = getAllWords(this.state.level, this.state.grade);
    const options = Quiz.generateOptions(word, pool, 4);
    const container = document.getElementById('quizOptions');
    container.innerHTML = '';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.textContent = opt.meaning;
      btn.addEventListener('click', () => this.handleQuizAnswer(opt, word, btn));
      container.appendChild(btn);
    });

    // 移动端需要用户点击发音按钮触发语音
  },

  handleQuizAnswer(selected, correct, btn) {
    if (this.state.isQuizAnswered) return;
    this.state.isQuizAnswered = true;

    const isCorrect = selected.id === correct.id;
    const allBtns = document.querySelectorAll('.quiz-option');

    if (isCorrect) {
      btn.classList.add('correct');
      Quiz.playSound('correct');
      this.state.quizCorrect++;
      document.getElementById('quizScore').textContent = `正确: ${this.state.quizCorrect}`;
    } else {
      btn.classList.add('wrong');
      Quiz.playSound('wrong');
      // 显示正确答案
      allBtns.forEach(b => {
        if (b.textContent === correct.meaning && !b.classList.contains('wrong')) {
          b.classList.add('correct');
        }
      });
    }

    const feedback = document.getElementById('quizFeedback');
    feedback.style.display = 'block';
    feedback.className = 'quiz-feedback ' + (isCorrect ? 'correct' : 'wrong');
    feedback.innerHTML = isCorrect
      ? '✓ 正确！'
      : `✗ 正确答案：<strong>${correct.meaning}</strong>`;

    // 记录错词
    if (!isCorrect) {
      Storage.addWrongWord(correct.id);
    }
    Storage.saveDailyProgress({
      correct: Storage.getDailyProgress().correct + (isCorrect ? 1 : 0),
      total: Storage.getDailyProgress().total + 1
    });

    // 禁用所有按钮
    allBtns.forEach(b => b.style.pointerEvents = 'none');

    // 1.5秒后下一题
    setTimeout(() => {
      this.state.quizIndex++;
      if (this.state.quizIndex >= this.state.quizWords.length) {
        this.finishQuiz();
      } else {
        this.renderQuizCard();
      }
    }, 1500);
  },

  finishQuiz() {
    const total = this.state.quizWords.length;
    const correct = this.state.quizCorrect;
    const acc = total > 0 ? Math.round((correct / total) * 100) : 0;
    this.showToast(`测验完成！${correct}/${total} (${acc}%)`);
    this.navigate('home');
  },

  // ===== 错题复习 =====
  renderReview() {
    var self = this;
    var levels = ['primary', 'junior', 'senior', 'college'];
    Promise.all(levels.map(function (lv) { return loadLevelData(lv); })).then(function () {
      self._renderReviewInner();
    });
  },
  _renderReviewInner() {
    const wrongIds = Storage.getWrongWords();
    const all = getAllWords();
    const words = all.filter(w => wrongIds.includes(w.id));
    document.getElementById('reviewCount').textContent = `${words.length} 个单词`;
    const container = document.getElementById('reviewList');
    if (words.length === 0) {
      container.innerHTML = '<p class="empty-tip">暂无错词，继续保持！</p>';
      return;
    }
    container.innerHTML = words.map(w => `
      <div class="word-item">
        <div class="info">
          <div class="word">${w.word} <span style="color:#7F8C8D;font-size:13px">${w.phonetic}</span></div>
          <div class="meaning">${w.meaning}</div>
        </div>
        <div class="actions">
          <button class="item-btn" data-speak="${w.id}">🔊</button>
          <button class="item-btn" data-remove="${w.id}">✓</button>
        </div>
      </div>
    `).join('');
    // 绑定事件
    container.querySelectorAll('[data-speak]').forEach(btn => {
      btn.addEventListener('click', () => {
        const word = all.find(w => w.id === parseInt(btn.dataset.speak));
        if (word) TTS.speakWord(word.word, Storage.getSettings().speechRate);
      });
    });
    container.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        Storage.removeWrongWord(parseInt(btn.dataset.remove));
        this.renderReview();
      });
    });
  },

  // ===== 单词本 =====
  renderWordbook() {
    var self = this;
    var levels = ['primary', 'junior', 'senior', 'college'];
    Promise.all(levels.map(function (lv) { return loadLevelData(lv); })).then(function () {
      self._renderWordbookInner();
    });
  },
  _renderWordbookInner() {
    const bookIds = Storage.getWordbook();
    const all = getAllWords();
    const words = all.filter(w => bookIds.includes(w.id));
    document.getElementById('bookHeaderCount').textContent = `${words.length} 个单词`;
    const container = document.getElementById('wordbookList');
    if (words.length === 0) {
      container.innerHTML = '<p class="empty-tip">还没有收藏单词</p>';
      return;
    }
    container.innerHTML = words.map(w => `
      <div class="word-item">
        <div class="info">
          <div class="word">${w.word} <span style="color:#7F8C8D;font-size:13px">${w.phonetic}</span></div>
          <div class="meaning">${w.meaning}</div>
        </div>
        <div class="actions">
          <button class="item-btn" data-speak="${w.id}">🔊</button>
          <button class="item-btn" data-bookmark="${w.id}" style="color:#F39C12">⭐</button>
        </div>
      </div>
    `).join('');
    // 绑定事件
    container.querySelectorAll('[data-speak]').forEach(btn => {
      btn.addEventListener('click', () => {
        const word = all.find(w => w.id === parseInt(btn.dataset.speak));
        if (word) TTS.speakWord(word.word, Storage.getSettings().speechRate);
      });
    });
    container.querySelectorAll('[data-bookmark]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.bookmark);
        Storage.toggleWordbook(id);
        this.renderWordbook();
      });
    });
  },

  // ===== 拼写模式 =====
  startSpell() {
    var self = this;
    loadLevelData(this.state.level).then(function () {
      var all = getAllWords(self.state.level, self.state.grade);
      if (all.length === 0) {
        self.showToast('词库为空');
        return;
      }
      self.state.spellWords = Quiz.shuffle(all);
      self.state.spellIndex = 0;
      self.state.spellCorrect = 0;
      self.state.isSpellAnswered = false;
      self.navigate('spell');
      self.renderSpellCard();
    });
  },

  renderSpellCard() {
    const word = this.state.spellWords[this.state.spellIndex];
    if (!word) {
      this.finishSpell();
      return;
    }
    this.state.isSpellAnswered = false;
    document.getElementById('spellProgress').textContent = `第 ${this.state.spellIndex + 1} 词`;
    document.getElementById('spellScore').textContent = `正确: ${this.state.spellCorrect}`;
    document.getElementById('spellInput').value = '';
    document.getElementById('spellFeedback').style.display = 'none';
    document.getElementById('spellInput').focus();

    // 移动端需要用户点击发音按钮触发语音
  },

  handleSpellSubmit() {
    if (this.state.isSpellAnswered) return;
    const word = this.state.spellWords[this.state.spellIndex];
    if (!word) return;

    const input = document.getElementById('spellInput').value.trim();
    if (!input) {
      this.showToast('请输入单词');
      return;
    }

    this.state.isSpellAnswered = true;
    const isCorrect = input.toLowerCase() === word.word.toLowerCase();
    const feedback = document.getElementById('spellFeedback');
    feedback.style.display = 'block';

    if (isCorrect) {
      feedback.className = 'spell-feedback correct';
      feedback.innerHTML = `✓ 正确！ <strong>${word.word}</strong> — ${word.meaning}`;
      Quiz.playSound('correct');
      this.state.spellCorrect++;
      document.getElementById('spellScore').textContent = `正确: ${this.state.spellCorrect}`;
    } else {
      feedback.className = 'spell-feedback wrong';
      feedback.innerHTML = `✗ 错误！正确答案是 <strong>${word.word}</strong> — ${word.meaning}`;
      Quiz.playSound('wrong');
      Storage.addWrongWord(word.id);
    }

    Storage.saveDailyProgress({
      correct: Storage.getDailyProgress().correct + (isCorrect ? 1 : 0),
      total: Storage.getDailyProgress().total + 1
    });

    setTimeout(() => {
      this.state.spellIndex++;
      if (this.state.spellIndex >= this.state.spellWords.length) {
        this.finishSpell();
      } else {
        this.renderSpellCard();
      }
    }, 2000);
  },

  finishSpell() {
    const total = this.state.spellWords.length;
    const correct = this.state.spellCorrect;
    const acc = total > 0 ? Math.round((correct / total) * 100) : 0;
    this.showToast(`拼写完成！${correct}/${total} (${acc}%)`);
    this.navigate('home');
  },

  // ===== 设置 =====
  openSettings() {
    const settings = Storage.getSettings();
    document.getElementById('settingGoal').value = settings.dailyGoal;
    document.getElementById('settingRate').value = settings.speechRate;
    document.getElementById('settingRateVal').textContent = settings.speechRate;
    // 高亮当前主题按钮
    var theme = settings.theme || 'auto';
    document.querySelectorAll('.theme-opt').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    document.getElementById('settingsOverlay').style.display = 'flex';
  },

  closeSettings() {
    const goal = parseInt(document.getElementById('settingGoal').value) || 50;
    const rate = parseFloat(document.getElementById('settingRate').value) || 0.9;
    Storage.saveSettings({ dailyGoal: Math.min(200, Math.max(10, goal)), speechRate: rate });
    document.getElementById('settingsOverlay').style.display = 'none';
  },

  applyTheme: function (theme) {
    var root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    localStorage.setItem('vocab_theme', theme);
    // 更新 theme-color meta
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f0f1a' : '#4A90D9');
  },

  // ===== 数字递增动画 =====
  countUp: function (id, target) {
    var el = document.getElementById(id);
    if (!el) return;
    var current = parseInt(el.textContent) || 0;
    if (current === target) return;
    var duration = 400;
    var start = performance.now();
    var from = current;
    function tick(now) {
      var t = Math.min((now - start) / duration, 1);
      var ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
      el.textContent = Math.round(from + (target - from) * ease);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  },

  countUpTo: function (id, target, suffix) {
    var el = document.getElementById(id);
    if (!el) return;
    var current = parseInt(el.textContent) || 0;
    if (current === target) { el.textContent = target + suffix; return; }
    var duration = 400;
    var start = performance.now();
    var from = current;
    function tick(now) {
      var t = Math.min((now - start) / duration, 1);
      var ease = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (target - from) * ease) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  },

  // ===== Toast =====
  showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.display = 'block';
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.style.display = 'none';
    }, 2000);
  }
};

// 启动应用
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { App.init(); });
} else {
  App.init();
}

// 主应用逻辑
const App = {
  // ===== 状态 =====
  state: {
    mode: 'home',
    category: 'core',
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
    this.state.category = settings.category || 'core';
    this.bindEvents();
    this.navigate('home');
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

    // 首页分类切换
    document.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.category = btn.dataset.cat;
        Storage.saveSettings({ category: this.state.category });
        this.renderHome();
      });
    });

    // 首页快捷入口（不含底部导航按钮）
    document.querySelectorAll('#mainContent [data-nav], .home-actions [data-nav]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (e.target.closest('.cat-btn')) return;
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
      card.classList.toggle('flipped');
      if (card.classList.contains('flipped')) {
        Quiz.playSound('flip');
      }
    });
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
      home: '单词背诵', learn: '学习模式', quiz: '测验模式',
      review: '错题复习', wordbook: '单词本', spell: '拼写模式'
    };
    document.getElementById('pageTitle').textContent = titles[mode] || '单词背诵';
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

    document.getElementById('learnedCount').textContent = daily.learned;
    document.getElementById('streakDays').textContent = streak;
    document.getElementById('accuracyRate').textContent = accuracy + '%';
    document.getElementById('totalLearned').textContent = stats.totalLearned;
    document.getElementById('wrongCount').textContent = Storage.getWrongWords().length;
    document.getElementById('bookCount').textContent = Storage.getWordbook().length;

    // 更新圆形进度
    const circle = document.getElementById('progressCircle');
    const circumference = 2 * Math.PI * 52; // ~326.73
    const ratio = Math.min(daily.learned / settings.dailyGoal, 1);
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = circumference * (1 - ratio);

    // 更新分类按钮
    document.querySelectorAll('.cat-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === this.state.category);
    });

    // 自动打卡
    Storage.checkin();
  },

  // ===== 学习模式 =====
  startLearn() {
    if (this.state.mode === 'learn' && this.state.dailyWords.length > 0) {
      // 已在学习模式，继续
      this.navigate('learn');
      this.renderLearnCard();
      return;
    }
    const all = getAllWords(this.state.category);
    if (all.length === 0) {
      this.showToast('词库为空');
      return;
    }
    // 随机打乱作为今日学习列表
    this.state.dailyWords = Quiz.shuffle(all);
    this.state.currentIndex = 0;
    this.navigate('learn');
    this.renderLearnCard();
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
    // 自动发音
    setTimeout(() => TTS.speakWord(word.word, Storage.getSettings().speechRate), 300);
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

  // ===== 测验模式 =====
  startQuiz() {
    const all = getAllWords(this.state.category);
    if (all.length < 4) {
      this.showToast('词库单词不足，至少需要4个');
      return;
    }
    this.state.quizWords = Quiz.shuffle(all);
    this.state.quizIndex = 0;
    this.state.quizCorrect = 0;
    this.state.isQuizAnswered = false;
    this.navigate('quiz');
    this.renderQuizCard();
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

    const pool = getAllWords(this.state.category);
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

    setTimeout(() => TTS.speakWord(word.word, Storage.getSettings().speechRate), 300);
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
    const all = getAllWords(this.state.category);
    if (all.length === 0) {
      this.showToast('词库为空');
      return;
    }
    this.state.spellWords = Quiz.shuffle(all);
    this.state.spellIndex = 0;
    this.state.spellCorrect = 0;
    this.state.isSpellAnswered = false;
    this.navigate('spell');
    this.renderSpellCard();
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

    setTimeout(() => TTS.speakWord(word.word, Storage.getSettings().speechRate), 300);
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
    document.getElementById('settingsOverlay').style.display = 'flex';
  },

  closeSettings() {
    const goal = parseInt(document.getElementById('settingGoal').value) || 50;
    const rate = parseFloat(document.getElementById('settingRate').value) || 0.9;
    Storage.saveSettings({ dailyGoal: Math.min(200, Math.max(10, goal)), speechRate: rate });
    document.getElementById('settingsOverlay').style.display = 'none';
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
document.addEventListener('DOMContentLoaded', () => App.init());

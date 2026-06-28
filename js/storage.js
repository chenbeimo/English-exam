// 本地存储模块
const Storage = {
  // ===== 每日学习进度 =====
  getDailyProgress() {
    const key = 'vocab_daily';
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    const today = new Date().toDateString();
    if (data.date !== today) {
      return { date: today, learned: 0, correct: 0, total: 0 };
    }
    return data;
  },

  saveDailyProgress(updates) {
    const progress = this.getDailyProgress();
    Object.assign(progress, updates);
    localStorage.setItem('vocab_daily', JSON.stringify(progress));
  },

  // ===== 累计统计 =====
  getStats() {
    const defaults = { totalLearned: 0, totalCorrect: 0, totalAttempts: 0 };
    const data = JSON.parse(localStorage.getItem('vocab_stats') || '{}');
    return Object.assign(defaults, data);
  },

  saveStats(updates) {
    const stats = this.getStats();
    Object.assign(stats, updates);
    localStorage.setItem('vocab_stats', JSON.stringify(stats));
  },

  // ===== 错词本 =====
  getWrongWords() {
    return JSON.parse(localStorage.getItem('vocab_wrong') || '[]');
  },

  addWrongWord(wordId) {
    const wrong = this.getWrongWords();
    if (!wrong.includes(wordId)) {
      wrong.push(wordId);
      localStorage.setItem('vocab_wrong', JSON.stringify(wrong));
    }
  },

  removeWrongWord(wordId) {
    let wrong = this.getWrongWords();
    wrong = wrong.filter(id => id !== wordId);
    localStorage.setItem('vocab_wrong', JSON.stringify(wrong));
  },

  // ===== 单词本（收藏） =====
  getWordbook() {
    return JSON.parse(localStorage.getItem('vocab_book') || '[]');
  },

  toggleWordbook(wordId) {
    let book = this.getWordbook();
    const idx = book.indexOf(wordId);
    if (idx === -1) {
      book.push(wordId);
    } else {
      book.splice(idx, 1);
    }
    localStorage.setItem('vocab_book', JSON.stringify(book));
    return idx === -1; // true = 已收藏, false = 已取消
  },

  // ===== 打卡记录 =====
  getCheckins() {
    return JSON.parse(localStorage.getItem('vocab_checkins') || '[]');
  },

  checkin() {
    const today = new Date().toDateString();
    const checkins = this.getCheckins();
    if (checkins[checkins.length - 1] !== today) {
      checkins.push(today);
      localStorage.setItem('vocab_checkins', JSON.stringify(checkins));
    }
  },

  getStreakDays() {
    const checkins = this.getCheckins();
    if (checkins.length === 0) return 0;
    let streak = 0;
    const today = new Date();
    // 检查今天或昨天是否有打卡
    const lastDate = new Date(checkins[checkins.length - 1]);
    const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) return 0;
    // 从最后一天往前数连续天数
    for (let i = checkins.length - 1; i >= 0; i--) {
      if (i === checkins.length - 1) {
        streak = 1;
      } else {
        const prev = new Date(checkins[i + 1]);
        const curr = new Date(checkins[i]);
        const diff = Math.floor((prev - curr) / (1000 * 60 * 60 * 24));
        if (diff === 1) streak++;
        else break;
      }
    }
    return streak;
  },

  // ===== 用户设置 =====
  getSettings() {
    const defaults = { dailyGoal: 50, speechRate: 0.9, theme: 'auto' };
    const data = JSON.parse(localStorage.getItem('vocab_settings') || '{}');
    return Object.assign(defaults, data);
  },

  saveSettings(updates) {
    const settings = this.getSettings();
    Object.assign(settings, updates);
    localStorage.setItem('vocab_settings', JSON.stringify(settings));
  },

  // ===== 闯关模式 =====
  getChallengeProgress() {
    var defaults = {
      levels: {},
      coins: 0,
      badges: [],
      dailyGoal: 5,
      dailyCleared: 0,
      dailyDate: '',
      streak: 0
    };
    var data = JSON.parse(localStorage.getItem('vocab_challenge') || '{}');
    return Object.assign(defaults, data);
  },

  saveChallengeProgress(updates) {
    var prog = this.getChallengeProgress();
    Object.assign(prog, updates);
    localStorage.setItem('vocab_challenge', JSON.stringify(prog));
  },

  addChallengeCoins(n) {
    var prog = this.getChallengeProgress();
    prog.coins = (prog.coins || 0) + n;
    localStorage.setItem('vocab_challenge', JSON.stringify(prog));
  },

  addChallengeBadge(badgeId) {
    var prog = this.getChallengeProgress();
    if (!prog.badges) prog.badges = [];
    if (!prog.badges.includes(badgeId)) {
      prog.badges.push(badgeId);
      localStorage.setItem('vocab_challenge', JSON.stringify(prog));
      return true; // 新徽章
    }
    return false; // 已有
  },

  // ===== 重置所有数据 =====
  resetAll() {
    localStorage.removeItem('vocab_daily');
    localStorage.removeItem('vocab_stats');
    localStorage.removeItem('vocab_wrong');
    localStorage.removeItem('vocab_book');
    localStorage.removeItem('vocab_checkins');
    localStorage.removeItem('vocab_settings');
    localStorage.removeItem('vocab_challenge');
  }
};

// ===== 无道词典词库壳（懒加载） =====
var wordDB = {};

// ===== 按需加载学段数据 =====
var _loadedLevels = {};
function loadLevelData(level) {
  if (wordDB[level] && wordDB[level].name) {
    return Promise.resolve();
  }
  if (_loadedLevels[level]) {
    return _loadedLevels[level];
  }
  _loadedLevels[level] = new Promise(function (resolve, reject) {
    var s = document.createElement('script');
    s.src = 'js/wordData-' + level + '.js';
    s.onload = function () { resolve(); };
    s.onerror = function () { reject(new Error('Failed to load ' + level)); };
    document.head.appendChild(s);
  });
  return _loadedLevels[level];
}

// ===== 获取所有单词（支持新结构） =====
function getAllWords(level, gradeOrCat) {
  var words = [];
  if (!level) {
    for (var lk in wordDB) {
      collectLevel(wordDB[lk], lk, words);
    }
  } else {
    var lv = wordDB[level];
    if (!lv) return [];
    if (level === 'college') {
      if (gradeOrCat && lv.categories && lv.categories[gradeOrCat]) {
        loadCollegeUnits(lv.categories[gradeOrCat], words, gradeOrCat);
      } else {
        for (var ck in lv.categories) {
          loadCollegeUnits(lv.categories[ck], words, ck);
        }
      }
    } else {
      if (lv.grades) {
        if (gradeOrCat && lv.grades[gradeOrCat]) {
          loadGrade(lv.grades[gradeOrCat], words, gradeOrCat);
        } else {
          for (var gk in lv.grades) {
            loadGrade(lv.grades[gk], words, gk);
          }
        }
      }
    }
  }
  return words;
}

function loadGrade(grade, words, catKey) {
  if (grade.books) {
    grade.books.forEach(function (book) {
      book.units.forEach(function (unit) {
        unit.words.forEach(function (w) {
          words.push({ id: w.id, word: w.word, phonetic: w.phonetic, meaning: w.meaning, example: w.example, exampleCn: w.exampleCn, category: catKey });
        });
      });
    });
  }
}

function loadCollegeUnits(cat, words, catKey) {
  if (cat.units) {
    cat.units.forEach(function (unit) {
      unit.words.forEach(function (w) {
        words.push({ id: w.id, word: w.word, phonetic: w.phonetic, meaning: w.meaning, example: w.example, exampleCn: w.exampleCn, category: catKey });
      });
    });
  }
}

function collectLevel(level, key, words) {
  if (level.grades) {
    for (var gk in level.grades) {
      loadGrade(level.grades[gk], words, gk);
    }
  }
  if (level.categories) {
    for (var ck in level.categories) {
      loadCollegeUnits(level.categories[ck], words, ck);
    }
  }
}

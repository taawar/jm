export const storageKey = 'jejak-mbako.progress.v1';

export function freshProgress() {
  return {
    nickname: '',
    completedChapters: [],
    lastChapter: null,
    completedMissions: [],
    quiz: null,
  };
}

export function gradeQuiz(answers, questions) {
  const valid = [];
  for (const [index, question] of questions.entries()) {
    const answer = Array.isArray(answers) ? answers[index] : null;
    if (
      !answer ||
      answer.id !== question.id ||
      !Number.isInteger(answer.choice) ||
      answer.choice < 0 ||
      answer.choice >= question.options.length
    )
      break;
    valid.push({ id: question.id, choice: answer.choice });
  }
  return {
    answers: valid,
    score: valid.reduce(function (score, answer, index) {
      return score + Number(answer.choice === questions[index].answer);
    }, 0),
    total: questions.length,
    completed: questions.length > 0 && valid.length === questions.length,
  };
}

// Ambil progres dari awal dan berhenti di item pertama yang belum selesai.
function ambilYangBerurutan(daftar, yangSelesai) {
  const hasil = [];

  for (const item of daftar) {
    if (!yangSelesai.includes(item.id)) break;
    hasil.push(item.id);
  }

  return hasil;
}

export function validateProgress(value, story) {
  const clean = freshProgress();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return clean;
  const chapterIds = new Set(
    story.bab.map(function (item) {
      return item.id;
    }),
  );
  const manualIds = new Set(
    story.misi
      .filter(function (item) {
        return item.kind !== 'quiz';
      })
      .map(function (item) {
        return item.id;
      }),
  );
  if (typeof value.nickname === 'string')
    clean.nickname = [...value.nickname.trim()].slice(0, 24).join('');
  if (Array.isArray(value.completedChapters))
    clean.completedChapters = [
      ...new Set(
        value.completedChapters.filter(function (id) {
          return chapterIds.has(id);
        }),
      ),
    ];
  if (chapterIds.has(value.lastChapter)) clean.lastChapter = value.lastChapter;
  if (Array.isArray(value.completedMissions))
    clean.completedMissions = [
      ...new Set(
        value.completedMissions.filter(function (id) {
          return manualIds.has(id);
        }),
      ),
    ];
  if (value.quiz && Array.isArray(value.quiz.answers))
    clean.quiz = gradeQuiz(value.quiz.answers, story.kuis);
  if (clean.quiz?.completed) {
    for (const mission of story.misi)
      if (mission.kind === 'quiz') clean.completedMissions.push(mission.id);
  }
  clean.completedChapters = ambilYangBerurutan(story.bab, clean.completedChapters);
  clean.completedMissions = ambilYangBerurutan(story.misi, clean.completedMissions);

  const posisiBabTerakhir = story.bab.findIndex(function (item) {
    return item.id === clean.lastChapter;
  });
  if (posisiBabTerakhir > clean.completedChapters.length) {
    clean.lastChapter = story.bab[clean.completedChapters.length]?.id || null;
  }

  return clean;
}

export function readStoredProgress(
  story,
  getStorage = function () {
    return localStorage;
  },
) {
  let raw;
  try {
    raw = getStorage().getItem(storageKey);
  } catch {
    return { progress: freshProgress(), available: false };
  }
  try {
    return {
      progress: validateProgress(raw ? JSON.parse(raw) : null, story),
      available: true,
    };
  } catch {
    return { progress: freshProgress(), available: true };
  }
}

export function writeStoredProgress(
  progress,
  getStorage = function () {
    return localStorage;
  },
) {
  try {
    getStorage().setItem(storageKey, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

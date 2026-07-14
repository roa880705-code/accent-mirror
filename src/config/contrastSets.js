const politeRequestQuestionIntonation = {
  sentenceType: "polite_request_question",
  expectedFinalContour: "moderate_rise",
  naturalRiseRange: [1.2, 5.0],
  overRiseAbove: 5.0,
  fallingBelow: 0.3,
  flatRange: [-0.5, 1.0]
};

const neutralStatementIntonation = {
  sentenceType: "statement",
  expectedFinalContour: "neutral_or_falling",
  naturalRiseRange: [-3.0, 1.2],
  overRiseAbove: 3.8,
  fallingBelow: -5.0,
  flatRange: [-0.8, 0.8]
};

const neutralFragmentIntonation = {
  sentenceType: "fragment",
  expectedFinalContour: "neutral",
  naturalRiseRange: [-1.5, 2.5],
  overRiseAbove: 4.5,
  fallingBelow: -2.5,
  flatRange: [-0.8, 0.8]
};

const contrastSets = [
  {
    id: "could-only",
    label: "A. Could only",
    text: "Could",
    critical: ["could"],
    intonationTarget: neutralFragmentIntonation,
    focus: "Could 単体の母音と語尾 d を確認する"
  },
  {
    id: "could-you",
    label: "B. Could you",
    text: "Could you",
    critical: ["could"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "Could と you の連結・区切りを確認する"
  },
  {
    id: "could-help-me",
    label: "C. Could you help me?",
    text: "Could you help me?",
    critical: ["could", "help"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "依頼文全体で could/help と文尾上昇を確認する"
  },
  {
    id: "help-only",
    label: "D. Help only",
    text: "Help",
    critical: ["help"],
    intonationTarget: neutralFragmentIntonation,
    focus: "help 単体の h/l/p を確認する"
  },
  {
    id: "teach-me",
    label: "E. Can you teach me?",
    text: "Can you teach me?",
    critical: ["can", "teach", "me"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "Can you の連結と teach の ch を確認する"
  },
  {
    id: "pass-salt",
    label: "F. Could you pass me the salt?",
    text: "Could you pass me the salt?",
    critical: ["could", "pass", "salt"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "pass/salt の s と語尾 t、文全体の速度を確認する"
  },
  {
    id: "phone-number",
    label: "G. Can I have your phone number?",
    text: "Can I have your phone number?",
    critical: ["can", "have", "phone", "number"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "phone number の連結、v/f/n の輪郭を確認する"
  },
  {
    id: "have-pen",
    label: "H. I have a pen.",
    text: "I have a pen.",
    critical: ["have", "pen"],
    intonationTarget: neutralStatementIntonation,
    focus: "肯定文の文尾を上げすぎないか確認する"
  },
  {
    id: "see-you",
    label: "I. I will see you tomorrow.",
    text: "I will see you tomorrow.",
    critical: ["will", "see", "tomorrow"],
    intonationTarget: neutralStatementIntonation,
    focus: "will の弱化、see you の連結、肯定文のピッチを確認する"
  },
  {
    id: "work-today",
    label: "J. I have to work today.",
    text: "I have to work today.",
    critical: ["have", "work", "today"],
    intonationTarget: neutralStatementIntonation,
    focus: "have to の連結、work の r/k、文末の下がり方を確認する"
  },
  {
    id: "consider-it",
    label: "K. I will consider it.",
    text: "I will consider it.",
    critical: ["consider"],
    intonationTarget: neutralStatementIntonation,
    focus: "consider vs con cider"
  },
  {
    id: "she-is-here",
    label: "L. She is here.",
    text: "She is here.",
    critical: ["she"],
    intonationTarget: neutralStatementIntonation,
    focus: "she vs see / sea"
  },
  {
    id: "live-here",
    label: "M. I live here.",
    text: "I live here.",
    critical: ["live"],
    intonationTarget: neutralStatementIntonation,
    focus: "live vs leave"
  },
  {
    id: "leave-here",
    label: "N. I leave here.",
    text: "I leave here.",
    critical: ["leave"],
    intonationTarget: neutralStatementIntonation,
    focus: "leave vs live"
  }
];

function getContrastSet(idOrText) {
  return contrastSets.find((set) => set.id === idOrText || set.text === idOrText) || contrastSets[0];
}

module.exports = { contrastSets, getContrastSet };

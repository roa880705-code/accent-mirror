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

// 練習セット(発音ドリル)は、以前は単語単体の練習(Could/Help)や個別の紛らわしい
// 単語ペア(consider/con cider, she/see/sea, live/leave)がフラットに並んでいたが、
// 実機フィードバックで内容を精査した結果、以下の方針で全面的に再設計した:
// - 単語単体の練習(A. Could / D. Help)は不要と判断し廃止
// - 学習者(ユーザー自身)が指定した6項目(簡単な平叙文/linking/疑問文の抑揚/
//   thサウンド/f・vサウンド/l・rの区別)に、日本語話者の発音でよく指摘される
//   6項目(語末の子音+母音付加・脱落/文強勢・リズム/語のアクセント位置/
//   母音の長短・二重母音/語末の有声・無声子音/短縮形・自然な省略)を加えた
//   計12カテゴリを、学習者のモチベーション低下を避けるため10文以内に収める
//   よう、1文に複数カテゴリを自然に組み合わせて9文に集約した。
const contrastSets = [
  {
    id: "drill-th-declarative",
    label: "A. 平叙文＋thサウンド",
    text: "I think this is a great idea.",
    critical: ["think", "this"],
    intonationTarget: neutralStatementIntonation,
    focus: "think の無声th(θ)と this の有声th(ð)の違いを確認する"
  },
  {
    id: "drill-linking-liaison",
    label: "B. 依頼文＋linking(子音+母音の連結)",
    text: "Could you pick it up on your way home?",
    critical: ["pick", "up"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "pick it up の子音+母音の連結(linking)を確認する"
  },
  {
    id: "drill-wh-question-lr",
    label: "C. Wh疑問文＋l/rの区別",
    text: "Where did you learn to run so fast?",
    critical: ["learn", "run"],
    intonationTarget: neutralStatementIntonation,
    focus: "learn の l と run の r を区別できているか確認する"
  },
  {
    id: "drill-fv-voicing",
    label: "D. f/vサウンド＋語末の有声・無声子音",
    text: "I found a very old photograph.",
    critical: ["found", "very", "photograph"],
    intonationTarget: neutralStatementIntonation,
    focus: "found/photograph の f音、very の v音、found(有声語尾)と photograph(無声語尾)の違いを確認する"
  },
  {
    id: "drill-linking-assimilation",
    label: "E. 疑問文＋linking(同化)",
    text: "Did you check the schedule?",
    critical: ["did", "check"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "did you の同化(d+y→dʒ)と、check の語末子音(母音付加・脱落)を確認する"
  },
  {
    id: "drill-rhythm",
    label: "F. 文強勢・英語のリズム",
    text: "I'm going to the store to get some bread.",
    critical: ["going", "store", "bread"],
    intonationTarget: neutralStatementIntonation,
    focus: "内容語(going/store/bread)を強く、機能語(to/the/some)を弱く読む英語のリズムを確認する"
  },
  {
    id: "drill-contractions",
    label: "G. 短縮形・自然な省略",
    text: "I don't think it's necessary.",
    critical: ["dont", "its"],
    intonationTarget: neutralStatementIntonation,
    focus: "don't と it's の短縮形を自然に発音できているか確認する"
  },
  {
    id: "drill-vowel-diphthong",
    label: "H. 母音の長短・二重母音",
    text: "I'll take the train to the coast today.",
    critical: ["train", "coast"],
    intonationTarget: neutralStatementIntonation,
    focus: "train/coast/today の二重母音(diphthong)がカタカナ的に潰れていないか確認する"
  },
  {
    id: "drill-word-stress",
    label: "I. 語のアクセント位置",
    text: "I want to understand this lesson better.",
    critical: ["understand"],
    intonationTarget: neutralStatementIntonation,
    focus: "understand の強勢(アクセント)位置(un-der-STAND)を確認する"
  },

  // ここから下は「ストーリーモード」用。stage(1〜10)は友達数のしきい値で解放され、
  // 日本→カナダへの留学ストーリーに沿って発話シーンが進んでいく。
  {
    id: "greet-hi",
    label: "出会いの挨拶",
    text: "Hi, nice to meet you.",
    critical: ["nice", "meet"],
    intonationTarget: neutralStatementIntonation,
    focus: "nice/meet の子音連結と語尾の下がり方を確認する",
    stage: 1
  },
  {
    id: "greet-name",
    label: "自己紹介",
    text: "My name is Sora.",
    critical: ["name"],
    intonationTarget: neutralStatementIntonation,
    focus: "name の鼻音と My の弱化を確認する",
    stage: 1
  },
  {
    id: "greet-thanks",
    label: "お礼を言う",
    text: "Thank you so much.",
    critical: ["thank"],
    intonationTarget: neutralStatementIntonation,
    focus: "th音と so much の連結を確認する",
    stage: 1
  },
  {
    id: "school-start-time",
    label: "登校中の会話",
    text: "What time does school start?",
    critical: ["school", "start"],
    intonationTarget: neutralStatementIntonation,
    focus: "school の sk 連結と start の語頭子音を確認する",
    stage: 2
  },
  {
    id: "walk-together",
    label: "一緒に登下校",
    text: "Let's walk together.",
    critical: ["walk", "together"],
    intonationTarget: neutralStatementIntonation,
    focus: "walk の l と together の th を確認する",
    stage: 2
  },
  {
    id: "borrow-pen",
    label: "文房具を借りる",
    text: "Can I borrow your pen?",
    critical: ["borrow", "pen"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "borrow の r と pen の語尾鼻音を確認する",
    stage: 2
  },
  {
    id: "order-fries",
    label: "ファストフードで注文",
    text: "Can I get a medium fries?",
    critical: ["fries"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "fries の fr 連結と語尾のz音を確認する",
    stage: 3
  },
  {
    id: "movie-time",
    label: "映画館で確認",
    text: "What time does the movie start?",
    critical: ["movie", "start"],
    intonationTarget: neutralStatementIntonation,
    focus: "movie の v と start の語頭子音を確認する",
    stage: 3
  },
  {
    id: "ask-price",
    label: "モールで買い物",
    text: "How much is this?",
    critical: ["much"],
    intonationTarget: neutralStatementIntonation,
    focus: "much の ch と how much の連結を確認する",
    stage: 3
  },
  {
    id: "homestay-bathroom",
    label: "ホームステイの朝",
    text: "Can I use the bathroom first?",
    critical: ["bathroom"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "bathroom の th と語尾 m を確認する",
    stage: 4
  },
  {
    id: "homestay-dinner",
    label: "夕食の時間",
    text: "Dinner smells great.",
    critical: ["dinner", "smells"],
    intonationTarget: neutralStatementIntonation,
    focus: "dinner の n と smells の sm 連結を確認する",
    stage: 4
  },
  {
    id: "homestay-curfew",
    label: "門限の確認",
    text: "What time should I be back?",
    critical: ["back"],
    intonationTarget: neutralStatementIntonation,
    focus: "back の語尾 k と be back の連結を確認する",
    stage: 4
  },
  {
    id: "class-repeat",
    label: "授業で聞き返す",
    text: "Could you repeat the question?",
    critical: ["repeat"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "repeat の r と語尾の t を確認する",
    stage: 5
  },
  {
    id: "class-missed",
    label: "聞き取れなかった時",
    text: "I didn't catch that.",
    critical: ["catch"],
    intonationTarget: neutralStatementIntonation,
    focus: "catch の ch と didn't の連結を確認する",
    stage: 5
  },
  {
    id: "class-deadline",
    label: "提出物の相談",
    text: "Can I turn this in tomorrow?",
    critical: ["turn"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "turn の r と in の連結を確認する",
    stage: 5
  },
  {
    id: "present-slide",
    label: "プレゼンの説明",
    text: "Let me walk you through this slide.",
    critical: ["walk", "slide"],
    intonationTarget: neutralStatementIntonation,
    focus: "walk you through の連結と slide の s を確認する",
    stage: 6
  },
  {
    id: "present-conclusion",
    label: "プレゼンの結び",
    text: "In conclusion, this project was a success.",
    critical: ["conclusion"],
    intonationTarget: neutralStatementIntonation,
    focus: "conclusion の sh音と語尾を確認する",
    stage: 6
  },
  {
    id: "present-questions",
    label: "質疑応答の呼びかけ",
    text: "Any questions so far?",
    critical: ["questions"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "questions の qu と語尾 s を確認する",
    stage: 6
  },
  {
    id: "discuss-disagree",
    label: "意見の相違を伝える",
    text: "I see your point, but I disagree.",
    critical: ["disagree"],
    intonationTarget: neutralStatementIntonation,
    focus: "disagree の s と強勢位置を確認する",
    stage: 7
  },
  {
    id: "discuss-clarify",
    label: "確認を求める",
    text: "Could you clarify that?",
    critical: ["clarify"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "clarify の cl 連結と r を確認する",
    stage: 7
  },
  {
    id: "discuss-addpoint",
    label: "意見を付け加える",
    text: "I'd like to add something.",
    critical: ["something"],
    intonationTarget: neutralStatementIntonation,
    focus: "something の th と語尾 ng を確認する",
    stage: 7
  },
  {
    id: "intern-deadline",
    label: "締め切りの報告",
    text: "I'll have the draft ready by Friday.",
    critical: ["draft", "ready"],
    intonationTarget: neutralStatementIntonation,
    focus: "draft の dr 連結と ready の r を確認する",
    stage: 8
  },
  {
    id: "intern-review",
    label: "レビュー依頼",
    text: "Could you review this before the meeting?",
    critical: ["review"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "review の v と語頭の強勢を確認する",
    stage: 8
  },
  {
    id: "intern-effort",
    label: "謙虚な意気込み",
    text: "I'm still learning, but I'll do my best.",
    critical: ["learning"],
    intonationTarget: neutralStatementIntonation,
    focus: "learning の l と語尾 ng を確認する",
    stage: 8
  },
  {
    id: "biz-followup",
    label: "フォローアップ連絡",
    text: "I'd like to follow up on our last call.",
    critical: ["follow"],
    intonationTarget: neutralStatementIntonation,
    focus: "follow up の連結と l を確認する",
    stage: 9
  },
  {
    id: "biz-align",
    label: "次のステップの確認",
    text: "Let's align on next steps.",
    critical: ["align"],
    intonationTarget: neutralStatementIntonation,
    focus: "align の l と語頭母音を確認する",
    stage: 9
  },
  {
    id: "biz-lookforward",
    label: "協働への期待",
    text: "I look forward to working with you.",
    critical: ["forward"],
    intonationTarget: neutralStatementIntonation,
    focus: "forward の r と語尾 d を確認する",
    stage: 9
  },
  {
    id: "propose",
    label: "プロポーズ",
    text: "Will you marry me?",
    critical: ["marry"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "marry の r と語尾 y を確認する",
    stage: 10
  },
  {
    id: "life-together",
    label: "人生を共にする誓い",
    text: "I want to spend my life with you.",
    critical: ["spend"],
    intonationTarget: neutralStatementIntonation,
    focus: "spend の sp 連結を確認する",
    stage: 10
  },
  {
    id: "everything-to-me",
    label: "深い愛情表現",
    text: "You mean everything to me.",
    critical: ["everything"],
    intonationTarget: neutralStatementIntonation,
    focus: "everything の th と語尾 ng を確認する",
    stage: 10
  }
];

const STORY_STAGES = [
  { stage: 1, name: "挨拶＋一言", threshold: 248, location: "japan" },
  { stage: 2, name: "立ち話・登下校", threshold: 300, location: "japan" },
  { stage: 3, name: "休日の外出", threshold: 400, location: "japan" },
  { stage: 4, name: "ホームステイ", threshold: 550, location: "canada" },
  { stage: 5, name: "留学先の授業", threshold: 700, location: "canada" },
  { stage: 6, name: "スピーチ・プレゼン", threshold: 900, location: "canada" },
  { stage: 7, name: "ディスカッション", threshold: 1100, location: "canada" },
  { stage: 8, name: "海外インターン", threshold: 1400, location: "canada" },
  { stage: 9, name: "グローバル企業への就職", threshold: 1800, location: "canada" },
  { stage: 10, name: "国際結婚", threshold: 2300, location: "canada" }
];

function getContrastSet(idOrText) {
  return contrastSets.find((set) => set.id === idOrText || set.text === idOrText) || contrastSets[0];
}

module.exports = { contrastSets, getContrastSet, STORY_STAGES };

"use strict";

// 高校英文法の問題バンク。
// 1 ユニット = 文法項目 1 つ、6 問（level 1 が基礎、3 が応用）。
// choiceNotes は「なぜその選択肢なのか / なぜ違うのか」を 4 つすべてに書く。

const grammarUnits = [
  {
    id: "tense",
    order: 1,
    title: "時制",
    subtitle: "現在・過去・未来と進行形の使い分け",
    overview:
      "英語の時制は「いつの話か」だけでなく「どう捉えているか」を表します。変わらない事実は現在形、話している瞬間に進行中のことは現在進行形、時・条件を表す副詞節の中では未来のことでも現在形を使います。",
    questions: [
      {
        id: "tense-1",
        level: 1,
        point: "現在形（不変の事実）",
        prompt: "Water ____ at 100 degrees Celsius.",
        choices: ["boils", "is boiling", "boiled", "will boil"],
        answerIndex: 0,
        translation: "水は摂氏100度で沸騰する。",
        explanation:
          "いつでも成り立つ事実・科学的真理は現在形で表します。今まさに沸いている一回の出来事ではないので進行形にはしません。",
        choiceNotes: [
          "正解。主語 Water は三人称単数扱いなので boils。不変の事実を表す現在形です。",
          "今この瞬間に沸いている最中、という意味になり「一般的な事実」を表せません。",
            "過去に一度沸いた、という一回の出来事の意味になります。",
          "これから沸くだろうという予測になり、常に成り立つ事実にはなりません。"
        ]
      },
      {
        id: "tense-2",
        level: 1,
        point: "過去進行形",
        prompt: "I ____ TV when the earthquake hit.",
        choices: ["was watching", "watched", "have watched", "am watching"],
        answerIndex: 0,
        translation: "地震が起きたとき、私はテレビを見ていた。",
        explanation:
          "「〜していた、そのときに…が起きた」という背景は過去進行形、割り込む出来事は過去形（hit）で表します。",
        choiceNotes: [
          "正解。地震が起きた時点で進行中だった動作なので過去進行形です。",
          "テレビを見た、という完了した動作になり「見ている最中に」という背景になりません。",
          "現在完了は過去の一時点を示す when 節と一緒には使えません。",
          "現在進行形なので、過去の出来事 hit と時がずれてしまいます。"
        ]
      },
      {
        id: "tense-3",
        level: 2,
        point: "時の副詞節中の現在形",
        prompt: "I'll call you as soon as I ____ home.",
        choices: ["get", "will get", "got", "am getting"],
        answerIndex: 0,
        translation: "家に着いたらすぐに電話します。",
        explanation:
          "when / as soon as / before / until など「時」を表す副詞節の中では、未来のことでも will を使わず現在形で表します。",
        choiceNotes: [
          "正解。as soon as 節は時の副詞節なので、未来の内容でも現在形 get を使います。",
          "時の副詞節の中に will は入れません。主節の I'll call が未来を表しています。",
          "過去形にすると、まだ起きていない未来の到着を表せません。",
          "進行形にする理由がなく、到着という一瞬の動作には合いません。"
        ]
      },
      {
        id: "tense-4",
        level: 2,
        point: "過去形と現在完了の区別",
        prompt: "She ____ in Osaka for three years when she was a child.",
        choices: ["lived", "has lived", "has been living", "is living"],
        answerIndex: 0,
        translation: "彼女は子どものころ、3年間大阪に住んでいた。",
        explanation:
          "when she was a child は「過去の区切られた時期」を示すので過去形です。現在完了は現在とつながっているときにしか使えません。",
        choiceNotes: [
          "正解。今はもう住んでいない、過去に閉じた3年間なので過去形です。",
          "現在完了は「過去の特定の時」を表す語句（when she was a child）と共に使えません。",
          "現在完了進行形も同じ理由で不可。今も続いている意味になってしまいます。",
          "現在進行形では、子どものころの話という時間設定と矛盾します。"
        ]
      },
      {
        id: "tense-5",
        level: 1,
        point: "現在進行形",
        prompt: "Look! It ____ outside.",
        choices: ["is snowing", "snows", "snowed", "has snowed"],
        answerIndex: 0,
        translation: "見て！外は雪が降っているよ。",
        explanation:
          "Look! と呼びかけているので、今まさに目の前で進行している動作です。現在進行形を使います。",
        choiceNotes: [
          "正解。発話の瞬間に進行中の動作なので現在進行形です。",
          "現在形は習慣や一般的事実を表すため、「この地域はよく雪が降る」の意味になります。",
          "過去形では、今見ている状況を説明できません。",
          "現在完了は「降り終わった結果が今ある」という意味で、降っている最中を表しません。"
        ]
      },
      {
        id: "tense-6",
        level: 3,
        point: "状態動詞は進行形にしない",
        prompt: "Sorry, I ____ what you mean.",
        choices: ["don't understand", "am not understanding", "didn't understand", "haven't understood"],
        answerIndex: 0,
        translation: "すみません、おっしゃる意味が分かりません。",
        explanation:
          "understand / know / believe / belong などの状態動詞は、原則として進行形にしません。今の状態は現在形で表します。",
        choiceNotes: [
          "正解。understand は状態動詞なので、今の状態も現在形で表します。",
          "状態動詞を進行形にしているため不自然です（一時的な変化を強調する例外的用法を除く）。",
          "過去形では、今分からないという現在の状態を伝えられません。",
          "現在完了にすると「今まで理解した経験がない」のような不自然な響きになります。"
        ]
      }
    ]
  },
  {
    id: "perfect",
    order: 2,
    title: "完了形",
    subtitle: "現在完了・過去完了・未来完了",
    overview:
      "完了形は「ある時点までの積み重ね」を表します。現在完了は今とのつながり、過去完了は過去のある時点より前、未来完了は未来のある時点までの完了・継続を表します。",
    questions: [
      {
        id: "perfect-1",
        level: 1,
        point: "現在完了（結果）",
        prompt: "I ____ my key, so I can't get into my room.",
        choices: ["have lost", "lost", "had lost", "lose"],
        answerIndex: 0,
        translation: "鍵をなくしてしまったので、部屋に入れない。",
        explanation:
          "「なくした → だから今入れない」と、過去の動作の結果が現在に残っています。現在完了の結果の用法です。",
        choiceNotes: [
          "正解。今も鍵が見つかっていない、という現在への影響を表します。",
          "過去形は過去の事実だけを述べ、今どうなっているかには触れません（その後見つかった可能性も残ります）。",
          "過去完了は「過去のある時点より前」を表すので、基準になる過去の時点が必要です。",
          "現在形では、すでに起きてしまった出来事を表せません。"
        ]
      },
      {
        id: "perfect-2",
        level: 1,
        point: "現在完了（継続）",
        prompt: "How long ____ each other?",
        choices: ["have you known", "do you know", "are you knowing", "did you know"],
        answerIndex: 0,
        translation: "お二人はどのくらいの付き合いですか。",
        explanation:
          "How long で「今まで何年間か」を尋ねるときは現在完了を使います。know は状態動詞なので進行形にしません。",
        choiceNotes: [
          "正解。過去から現在まで続く状態の長さを尋ねる現在完了です。",
          "現在形では「今知っているか」だけで、期間を尋ねる表現になりません。",
          "know は状態動詞なので進行形にできません。",
          "過去形にすると、今はもう知り合いでないかのような意味になります。"
        ]
      },
      {
        id: "perfect-3",
        level: 2,
        point: "過去完了（大過去）",
        prompt: "When I got to the platform, the train ____.",
        choices: ["had already left", "has already left", "already left", "was already leaving"],
        answerIndex: 0,
        translation: "私がホームに着いたとき、電車はすでに出てしまっていた。",
        explanation:
          "「着いた（過去）」よりさらに前に起きたことなので過去完了です。過去の基準時より前を表すときに使います。",
        choiceNotes: [
          "正解。got to という過去の時点より前に完了していたので過去完了です。",
          "現在完了は現在が基準なので、過去の時点との前後関係を表せません。",
          "過去形だと2つの出来事の前後関係がはっきりせず、already とも噛み合いません。",
          "過去進行形では「出発しかけていた」となり、already（すでに）と矛盾します。"
        ]
      },
      {
        id: "perfect-4",
        level: 2,
        point: "have been to と have gone to",
        prompt: "She ____ to Canada three times.",
        choices: ["has been", "has gone", "has went", "is going"],
        answerIndex: 0,
        translation: "彼女はカナダに3回行ったことがある。",
        explanation:
          "three times という回数がある「経験」なので have been to を使います。have gone to は「行ってしまって今ここにいない」という意味です。",
        choiceNotes: [
          "正解。have been to 〜 で「〜へ行ったことがある」という経験を表します。",
          "「行ってしまって今はここにいない」という結果の意味になり、回数とは相性が悪いです。",
          "go の過去分詞は gone です。went は過去形なので完了形には使えません。",
          "現在進行形では、これまでの経験回数を表せません。"
        ]
      },
      {
        id: "perfect-5",
        level: 3,
        point: "未来完了進行形",
        prompt: "By next March, I ____ English for ten years.",
        choices: ["will have been studying", "will study", "have studied", "am studying"],
        answerIndex: 0,
        translation: "来年の3月で、私は英語を10年間勉強してきたことになる。",
        explanation:
          "By next March という未来の時点までの継続なので未来完了（進行）形です。動作動詞の継続を強調するときは will have been -ing を使います。",
        choiceNotes: [
          "正解。未来のある時点までずっと続けていることを表します。",
          "単なる未来形では「10年間の積み重ね」を表せません。",
          "現在完了は現在までの継続なので、by next March と合いません。",
          "現在進行形では、今している動作だけを表します。"
        ]
      },
      {
        id: "perfect-6",
        level: 1,
        point: "since と現在完了",
        prompt: "He ____ for this company since 2015.",
        choices: ["has worked", "works", "worked", "is working"],
        answerIndex: 0,
        translation: "彼は2015年からこの会社で働いている。",
        explanation:
          "since +過去の起点があるときは、そこから現在まで続いていることを示す現在完了（または現在完了進行形）を使います。",
        choiceNotes: [
          "正解。2015年から今まで続く状態を表す現在完了です。",
          "現在形は今の習慣だけを表し、since 2015 という起点を受けられません。",
          "過去形では、今も働いているかどうかが表せず since とも噛み合いません。",
          "現在進行形だけでは、2015年からの継続を表せません。"
        ]
      }
    ]
  },
  {
    id: "modal",
    order: 3,
    title: "助動詞",
    subtitle: "推量・過去の助動詞＋have+過去分詞",
    overview:
      "助動詞は「事実」ではなく話し手の判断を加えます。must（〜に違いない）、can't（〜のはずがない）のような推量と、should have +過去分詞（〜すべきだったのに）のような過去への評価を区別して覚えます。",
    questions: [
      {
        id: "modal-1",
        level: 1,
        point: "must（強い推量）",
        prompt: "You ____ be tired after such a long flight.",
        choices: ["must", "can", "should", "would"],
        answerIndex: 0,
        translation: "あんなに長いフライトのあとなら、疲れているに違いないね。",
        explanation:
          "根拠があって「〜に違いない」と判断するときは must を使います。義務の must と同じ形ですが意味が違います。",
        choiceNotes: [
          "正解。「〜に違いない」という確信度の高い推量です。",
          "can は可能性の有無（〜ということもありうる）で、目の前の相手への断定には向きません。",
          "should は「〜のはずだ」という当然の予測で、ここでは断定が弱すぎます。",
          "would は仮定や意志を表し、現在の状態の推量にはなりません。"
        ]
      },
      {
        id: "modal-2",
        level: 2,
        point: "should have +過去分詞",
        prompt: "He ____ have told her the truth, but he lied.",
        choices: ["should", "would", "can", "will"],
        answerIndex: 0,
        translation: "彼は彼女に真実を話すべきだったのに、嘘をついた。",
        explanation:
          "should have +過去分詞で「〜すべきだったのに（実際はしなかった）」という後悔・非難を表します。",
        choiceNotes: [
          "正解。しなかったことへの「〜すべきだったのに」という評価です。",
          "would have +過去分詞は仮定法の帰結（〜しただろうに）で、義務の意味がありません。",
          "can have +過去分詞は肯定文ではほとんど使いません。",
          "will have +過去分詞は未来完了で、過去の行為への評価にはなりません。"
        ]
      },
      {
        id: "modal-3",
        level: 1,
        point: "had better",
        prompt: "That cough sounds bad. You ____ see a doctor right away.",
        choices: ["had better", "had better to", "would better", "better had"],
        answerIndex: 0,
        translation: "その咳はよくなさそうだ。すぐ医者に行ったほうがいい。",
        explanation:
          "had better +動詞の原形で「〜したほうがよい（さもないと困る）」という強めの助言になります。",
        choiceNotes: [
          "正解。had better のあとは to を付けずに原形が続きます。",
          "to が余計です。had better to という形はありません。",
          "would better という表現は使いません。",
          "語順が誤りです。主語のあとに had better と続けます。"
        ]
      },
      {
        id: "modal-4",
        level: 2,
        point: "過去の能力 could",
        prompt: "She ____ speak three languages when she was ten.",
        choices: ["could", "can", "may", "must"],
        answerIndex: 0,
        translation: "彼女は10歳のとき、3か国語を話せた。",
        explanation:
          "when she was ten という過去の話なので、can の過去形 could を使います。過去に持っていた能力を表します。",
        choiceNotes: [
          "正解。過去の継続的な能力は could で表します。",
          "現在形の can では、過去の時点の能力を表せません。",
          "may は許可・推量で、能力の意味はありません。",
          "must は義務・推量で、能力を表しません。"
        ]
      },
      {
        id: "modal-5",
        level: 3,
        point: "can't have +過去分詞",
        prompt: "You ____ have seen him yesterday; he was in Tokyo all day.",
        choices: ["can't", "mustn't", "shouldn't", "needn't"],
        answerIndex: 0,
        translation: "君が昨日彼を見たはずがない。彼は一日中東京にいたのだから。",
        explanation:
          "can't have +過去分詞で「〜したはずがない」という過去への強い否定の推量を表します。must have の反対です。",
        choiceNotes: [
          "正解。根拠を示して過去の可能性を否定する形です。",
          "mustn't は「〜してはいけない」という禁止で、推量の否定にはなりません。",
          "shouldn't have +過去分詞は「〜すべきでなかった」という非難です。",
          "needn't have +過去分詞は「〜する必要はなかったのに」という意味です。"
        ]
      },
      {
        id: "modal-6",
        level: 3,
        point: "needn't have +過去分詞",
        prompt: "You ____ have worried. Everything went well.",
        choices: ["needn't", "mustn't", "couldn't", "wouldn't"],
        answerIndex: 0,
        translation: "心配する必要はなかったんだよ。全部うまくいった。",
        explanation:
          "needn't have +過去分詞は「実際にはしたが、その必要はなかった」という意味です。ここでは相手が心配したことが前提です。",
        choiceNotes: [
          "正解。「心配したが、その必要はなかった」と伝えています。",
          "mustn't have という形は推量として使われません。",
          "couldn't have worried では「心配できたはずがない」と意味が通りません。",
          "wouldn't have worried は仮定法の帰結で、状況に合いません。"
        ]
      }
    ]
  },
  {
    id: "passive",
    order: 4,
    title: "受動態",
    subtitle: "進行形・完了形・群動詞の受動態",
    overview:
      "受動態は be +過去分詞が基本形です。動作主が重要でないとき、または話題の中心を「される側」に置きたいときに使います。進行形（be being +過去分詞）や群動詞（前置詞を残す）の形に注意します。",
    questions: [
      {
        id: "passive-1",
        level: 1,
        point: "過去の受動態",
        prompt: "This temple ____ in 1397.",
        choices: ["was built", "built", "has built", "was build"],
        answerIndex: 0,
        translation: "この寺は1397年に建てられた。",
        explanation:
          "寺は「建てられる」側なので受動態です。in 1397 という過去の時点があるので be動詞は was を使います。",
        choiceNotes: [
          "正解。was +過去分詞 built で「建てられた」を表します。",
          "能動態では「この寺が何かを建てた」という意味になってしまいます。",
          "現在完了の能動態であり、主語が建てたことになります。",
          "build の過去分詞は built です。was build は形が誤りです。"
        ]
      },
      {
        id: "passive-2",
        level: 2,
        point: "進行形の受動態",
        prompt: "The road ____ repaired now, so we have to take a detour.",
        choices: ["is being", "is", "has", "was"],
        answerIndex: 0,
        translation: "その道路は今修理中なので、迂回しなければならない。",
        explanation:
          "「今〜されている最中だ」は be being +過去分詞で表します。now があるので現在進行形の受動態です。",
        choiceNotes: [
          "正解。is being repaired で「修理されている最中」を表します。",
          "is repaired では「修理されている状態だ」となり、作業中であることを表しません。",
          "has repaired は能動態で、道路が何かを修理したことになります。",
          "was repaired は過去に修理されたという意味で、now と矛盾します。"
        ]
      },
      {
        id: "passive-3",
        level: 2,
        point: "群動詞の受動態",
        prompt: "He was laughed ____ by everyone in the room.",
        choices: ["at", "to", "with", "for"],
        answerIndex: 0,
        translation: "彼は部屋にいた全員に笑われた。",
        explanation:
          "laugh at 〜（〜を笑う）のような群動詞を受動態にするときは、前置詞をそのまま残します。",
        choiceNotes: [
          "正解。能動態 Everyone laughed at him. の at が残ります。",
          "laugh to という組み合わせはこの意味では使いません。",
          "laugh with は「一緒に笑う」で、からかう意味になりません。",
          "laugh for も意味をなしません。"
        ]
      },
      {
        id: "passive-4",
        level: 1,
        point: "未来の受動態",
        prompt: "The package ____ delivered by tomorrow evening.",
        choices: ["will be", "will", "is being", "has been"],
        answerIndex: 0,
        translation: "荷物は明日の夕方までに配達されるだろう。",
        explanation:
          "未来の受動態は will be +過去分詞です。by tomorrow evening が未来の期限を示しています。",
        choiceNotes: [
          "正解。will be delivered で未来に配達されることを表します。",
          "will delivered は be が欠けており、形が成立しません。",
          "is being delivered は今まさに配達中という意味になります。",
          "has been delivered ではすでに配達済みとなり、by tomorrow と矛盾します。"
        ]
      },
      {
        id: "passive-5",
        level: 3,
        point: "be said to +動詞の原形",
        prompt: "She is said ____ one of the best pianists of her time.",
        choices: ["to be", "being", "be", "to being"],
        answerIndex: 0,
        translation: "彼女は当時最高のピアニストの一人だと言われている。",
        explanation:
          "They say that she is 〜 を受動態にすると She is said to be 〜 となります。be said to のあとは動詞の原形です。",
        choiceNotes: [
          "正解。is said to be で「〜であると言われている」を表します。",
          "said のあとに動名詞 being を直接続ける形はとりません。",
          "to が必要です。be said be という形はありません。",
          "to be が正しい形で、to being とは言いません。"
        ]
      },
      {
        id: "passive-6",
        level: 2,
        point: "have +目的語+過去分詞（被害）",
        prompt: "I had my wallet ____ on the train yesterday.",
        choices: ["stolen", "steal", "stealing", "to steal"],
        answerIndex: 0,
        translation: "私は昨日、電車で財布を盗まれた。",
        explanation:
          "have +目的語+過去分詞で「〜される」という被害や、人にしてもらう意味を表します。財布は盗まれる側なので過去分詞です。",
        choiceNotes: [
          "正解。my wallet と steal の関係が受動なので過去分詞 stolen です。",
          "原形にすると財布が自分で盗む意味になってしまいます。",
          "現在分詞では「財布が盗んでいる」という能動の意味になります。",
          "この構文で to 不定詞は使いません。"
        ]
      }
    ]
  },
  {
    id: "infinitive",
    order: 5,
    title: "不定詞",
    subtitle: "to +動詞の原形と原形不定詞",
    overview:
      "to 不定詞は名詞・形容詞・副詞のはたらきをします。目的（〜するために）、判断の根拠（〜するとは）、結果（そして〜した）など副詞用法の幅が広いのが特徴です。make / let / have などのあとでは to のない原形不定詞を使います。",
    questions: [
      {
        id: "infinitive-1",
        level: 1,
        point: "want +目的語+ to 不定詞",
        prompt: "I want you ____ this letter before you leave.",
        choices: ["to read", "read", "reading", "reads"],
        answerIndex: 0,
        translation: "出かける前に、この手紙を読んでほしい。",
        explanation:
          "want / ask / tell / advise などは「目的語+ to 不定詞」の形をとります。you が read の意味上の主語です。",
        choiceNotes: [
          "正解。want +人+ to do で「人に〜してほしい」を表します。",
          "want のあとに原形を直接置くことはできません。",
          "want +人+ -ing という形はとりません。",
          "動詞が2つ並ぶ形になり、文として成立しません。"
        ]
      },
      {
        id: "infinitive-2",
        level: 1,
        point: "It is ... to do",
        prompt: "It is important ____ enough sleep before an exam.",
        choices: ["to get", "getting", "get", "got"],
        answerIndex: 0,
        translation: "試験の前には十分な睡眠をとることが大切だ。",
        explanation:
          "It を形式主語にして、真主語を to 不定詞で後ろに置く形です。It is +形容詞+ to do が基本形です。",
        choiceNotes: [
          "正解。形式主語 It の中身が to get enough sleep です。",
          "この構文では真主語に動名詞を置きません（It is no use -ing などの決まった形は例外）。",
          "原形だけでは主語のはたらきをできません。",
          "過去形は主語になれません。"
        ]
      },
      {
        id: "infinitive-3",
        level: 2,
        point: "enough to do",
        prompt: "She was kind enough ____ me the way to the station.",
        choices: ["to show", "showing", "show", "shown"],
        answerIndex: 0,
        translation: "彼女は親切に駅への道を教えてくれた。",
        explanation:
          "形容詞+ enough to do で「〜するほど十分に…」を表します。和訳では「親切に〜してくれた」と訳すと自然です。",
        choiceNotes: [
          "正解。kind enough to do で「親切にも〜してくれる」となります。",
          "enough のあとに動名詞は続けません。",
          "to が必要です。enough show という形はありません。",
          "過去分詞では受動の意味になり、文意が通りません。"
        ]
      },
      {
        id: "infinitive-4",
        level: 3,
        point: "完了不定詞",
        prompt: "He seems ____ been ill while he was abroad.",
        choices: ["to have", "to", "having", "have"],
        answerIndex: 0,
        translation: "彼は海外にいるあいだ病気だったようだ。",
        explanation:
          "主節（seems）より前のことを表すときは to have +過去分詞（完了不定詞）を使います。It seems that he was ill. と同じ内容です。",
        choiceNotes: [
          "正解。to have been で、seems より前の出来事を表します。",
          "to been という形は成立しません。",
          "seem のあとに動名詞は続けられません。",
          "to が欠けており、seems have という形にはなりません。"
        ]
      },
      {
        id: "infinitive-5",
        level: 2,
        point: "疑問詞+ to 不定詞",
        prompt: "I don't know what ____ in this situation.",
        choices: ["to do", "do I do", "doing", "to doing"],
        answerIndex: 0,
        translation: "この状況で何をすべきか分からない。",
        explanation:
          "疑問詞+ to 不定詞は名詞のはたらきをして「何を〜すべきか」を表します。know の目的語になっています。",
        choiceNotes: [
          "正解。what to do で「何をすべきか」という名詞句になります。",
          "間接疑問なら what I should do の語順で、疑問文の語順にはしません。",
          "what doing という形は名詞句として成立しません。",
          "to doing という形はありません。to のあとは原形です。"
        ]
      },
      {
        id: "infinitive-6",
        level: 2,
        point: "原形不定詞（make）",
        prompt: "The teacher made us ____ the whole poem.",
        choices: ["memorize", "to memorize", "memorizing", "memorized"],
        answerIndex: 0,
        translation: "先生は私たちに詩を全部暗記させた。",
        explanation:
          "make / let / have（使役動詞）と see / hear / feel（知覚動詞）のあとでは、to のない原形不定詞を使います。",
        choiceNotes: [
          "正解。make +目的語+原形で「（強制的に）〜させる」を表します。",
          "能動態の make では to を付けません（受動態 were made to memorize では to が現れます）。",
          "make +目的語+ -ing という形はとりません。",
          "過去分詞では「暗記される」という受動の意味になります。"
        ]
      }
    ]
  },
  {
    id: "gerund",
    order: 6,
    title: "動名詞",
    subtitle: "-ing を名詞として使う",
    overview:
      "動名詞は「すでにしていること・一般的な行為」を表しやすく、to 不定詞は「これからすること」を表しやすい傾向があります。enjoy / avoid / finish / mind などは動名詞のみを目的語にとります。",
    questions: [
      {
        id: "gerund-1",
        level: 1,
        point: "前置詞 to +動名詞",
        prompt: "I'm looking forward to ____ you again next spring.",
        choices: ["seeing", "see", "seen", "be seen"],
        answerIndex: 0,
        translation: "来春またお会いできるのを楽しみにしています。",
        explanation:
          "look forward to の to は前置詞なので、あとには名詞か動名詞がきます。不定詞の to と混同しやすい代表例です。",
        choiceNotes: [
          "正解。前置詞 to のあとなので動名詞 seeing にします。",
          "不定詞の to と勘違いした形です。ここでは原形は置けません。",
          "過去分詞は前置詞の目的語になれません。",
          "受動態にすると「見られること」となり、意味が通りません。"
        ]
      },
      {
        id: "gerund-2",
        level: 1,
        point: "動名詞のみを目的語にとる動詞",
        prompt: "He carefully avoided ____ my question.",
        choices: ["answering", "to answer", "answer", "answered"],
        answerIndex: 0,
        translation: "彼は私の質問に答えるのを巧みに避けた。",
        explanation:
          "avoid / enjoy / finish / give up / practice などは動名詞だけを目的語にとります。",
        choiceNotes: [
          "正解。avoid -ing で「〜するのを避ける」です。",
          "avoid は to 不定詞を目的語にとりません。",
          "原形をそのまま続けることはできません。",
          "過去形を目的語にすることはできません。"
        ]
      },
      {
        id: "gerund-3",
        level: 1,
        point: "Do you mind -ing",
        prompt: "It's getting cold. Do you mind ____ the window?",
        choices: ["closing", "to close", "close", "closed"],
        answerIndex: 0,
        translation: "寒くなってきました。窓を閉めていただけますか。",
        explanation:
          "mind は動名詞を目的語にとります。Do you mind -ing? は「〜していただけますか」という丁寧な依頼です。",
        choiceNotes: [
          "正解。mind のあとは動名詞です。",
          "mind は to 不定詞を目的語にとりません。",
          "原形を続ける形にはなりません。",
          "過去分詞では受動の意味になり、依頼になりません。"
        ]
      },
      {
        id: "gerund-4",
        level: 2,
        point: "remember -ing と remember to do",
        prompt: "I remember ____ him at the conference two years ago.",
        choices: ["meeting", "to meet", "meet", "met"],
        answerIndex: 0,
        translation: "2年前の学会で彼に会ったのを覚えている。",
        explanation:
          "remember -ing は「（過去に）〜したことを覚えている」、remember to do は「（これから）〜するのを忘れない」です。two years ago があるので動名詞です。",
        choiceNotes: [
          "正解。すでに起きたことを覚えている、という意味です。",
          "remember to meet では「これから会うのを忘れない」となり、two years ago と矛盾します。",
          "原形を目的語にはできません。",
          "過去形を目的語にすることはできません。"
        ]
      },
      {
        id: "gerund-5",
        level: 3,
        point: "It is no use -ing",
        prompt: "It is no use ____ over spilt milk.",
        choices: ["crying", "to cry", "cry", "cried"],
        answerIndex: 0,
        translation: "こぼれたミルクを嘆いても仕方がない（覆水盆に返らず）。",
        explanation:
          "It is no use -ing は「〜しても無駄だ」という決まった形です。to 不定詞は使いません。",
        choiceNotes: [
          "正解。慣用表現として動名詞をとります。",
          "この構文で to 不定詞は使いません。",
          "原形は主語や目的語のはたらきができません。",
          "過去形はこの位置に置けません。"
        ]
      },
      {
        id: "gerund-6",
        level: 2,
        point: "be used to -ing",
        prompt: "I'm not used to ____ up so early in the morning.",
        choices: ["getting", "get", "got", "be getting"],
        answerIndex: 0,
        translation: "私はこんなに朝早く起きるのに慣れていない。",
        explanation:
          "be used to -ing は「〜することに慣れている」。used to +原形（昔はよく〜した）との区別が問われます。",
        choiceNotes: [
          "正解。この to は前置詞なので動名詞が続きます。",
          "used to +原形は「以前はよく〜した」という別の表現です。",
          "過去形は前置詞の目的語になれません。",
          "be getting という形はここでは使いません。"
        ]
      }
    ]
  },
  {
    id: "participle",
    order: 7,
    title: "分詞・分詞構文",
    subtitle: "名詞を修飾する分詞と、文を修飾する分詞構文",
    overview:
      "現在分詞（-ing）は「〜している」という能動、過去分詞（-ed / -en）は「〜される・された」という受動を表します。分詞が文全体にかかると分詞構文になり、時・理由・条件などを表します。",
    questions: [
      {
        id: "participle-1",
        level: 1,
        point: "現在分詞の後置修飾",
        prompt: "The boy ____ on the bench is my brother.",
        choices: ["sitting", "sat", "to sit", "sit"],
        answerIndex: 0,
        translation: "ベンチに座っている少年は私の弟だ。",
        explanation:
          "the boy と sit の関係は能動（少年が座っている）なので現在分詞です。2語以上の分詞句は名詞の後ろに置きます。",
        choiceNotes: [
          "正解。who is sitting on the bench を短くした形です。",
          "sat は過去形・過去分詞で、ここでは能動の意味を表せません。",
          "to sit では「これから座るための少年」のような不自然な意味になります。",
          "原形は名詞を修飾できません。"
        ]
      },
      {
        id: "participle-2",
        level: 1,
        point: "過去分詞の後置修飾",
        prompt: "I found a book ____ in simple English.",
        choices: ["written", "writing", "wrote", "to write"],
        answerIndex: 0,
        translation: "やさしい英語で書かれた本を見つけた。",
        explanation:
          "本は「書かれる」側なので過去分詞 written を使います。which was written in simple English と同じ意味です。",
        choiceNotes: [
          "正解。受動の関係なので過去分詞です。",
          "現在分詞では「本が何かを書いている」ことになります。",
          "過去形は名詞を修飾できません。",
          "to write では「これから書くための本」という意味になります。"
        ]
      },
      {
        id: "participle-3",
        level: 2,
        point: "受動の分詞構文",
        prompt: "____ from the plane, the islands looked like green stones.",
        choices: ["Seen", "Seeing", "To see", "Having seen"],
        answerIndex: 0,
        translation: "飛行機から見ると、その島々は緑の石のように見えた。",
        explanation:
          "主語 the islands は「見られる」側なので過去分詞で始める受動の分詞構文にします。When they were seen from the plane と同じ意味です。",
        choiceNotes: [
          "正解。主語と see の関係が受動なので過去分詞で始めます。",
          "現在分詞にすると「島々が見ている」ことになってしまいます。",
          "To see 〜 では意味上の主語がずれ、文意が通りません。",
          "Having seen も能動なので、島々が見たことになります。"
        ]
      },
      {
        id: "participle-4",
        level: 2,
        point: "理由を表す分詞構文",
        prompt: "____ very tired, she went to bed without eating dinner.",
        choices: ["Being", "Been", "To be", "She being"],
        answerIndex: 0,
        translation: "とても疲れていたので、彼女は夕食も食べずに寝た。",
        explanation:
          "Because she was very tired を分詞構文にした形です。主語が主節と同じなので省略し、Being で始めます。",
        choiceNotes: [
          "正解。理由を表す分詞構文で、Being は省略されることもあります。",
          "Been だけでは文を始められません。",
          "To be では理由の意味になりません。",
          "主節と主語が同じなので、意味上の主語 She は不要です。"
        ]
      },
      {
        id: "participle-5",
        level: 1,
        point: "分詞句による修飾",
        prompt: "There was a girl ____ a red hat at the door.",
        choices: ["wearing", "worn", "wear", "to wear"],
        answerIndex: 0,
        translation: "ドアのところに赤い帽子をかぶった女の子がいた。",
        explanation:
          "a girl と wear の関係は能動（女の子がかぶっている）なので現在分詞です。",
        choiceNotes: [
          "正解。who was wearing a red hat を短くした形です。",
          "過去分詞では「女の子が着用されている」ことになります。",
          "原形は名詞を修飾できません。",
          "to wear では「これから帽子をかぶる予定の女の子」という意味になります。"
        ]
      },
      {
        id: "participle-6",
        level: 3,
        point: "独立分詞構文",
        prompt: "____ no bus at that hour, we had to walk home.",
        choices: ["There being", "There was", "Being there", "There been"],
        answerIndex: 0,
        translation: "その時間にはバスがなかったので、私たちは歩いて帰らなければならなかった。",
        explanation:
          "As there was no bus を分詞構文にすると There being no bus となります。there を残すのがポイントです。",
        choiceNotes: [
          "正解。there を意味上の主語として残した独立分詞構文です。",
          "接続詞がないため、文が2つ並んでしまい成立しません。",
          "Being there では「そこにいるので」という別の意味になります。",
          "There been という形は成立しません。"
        ]
      }
    ]
  },
  {
    id: "relative",
    order: 8,
    title: "関係詞",
    subtitle: "関係代名詞・関係副詞・複合関係詞",
    overview:
      "関係詞は2つの文をつなぎ、後ろから名詞を説明します。空所のあとが「不完全な文」なら関係代名詞、「完全な文」なら関係副詞、というのが見分け方の基本です。",
    questions: [
      {
        id: "relative-1",
        level: 2,
        point: "関係副詞 where",
        prompt: "This is the house ____ I was born.",
        choices: ["where", "which", "what", "whose"],
        answerIndex: 0,
        translation: "ここが私の生まれた家です。",
        explanation:
          "I was born は文として完成しているので、場所を表す関係副詞 where を使います。in which と書き換えられます。",
        choiceNotes: [
          "正解。あとに完全な文が続くので関係副詞です。",
          "which を使うなら which I was born in のように前置詞が必要です。",
          "what は先行詞を含むため、the house のあとには置けません。",
          "whose のあとには名詞が続きます。"
        ]
      },
      {
        id: "relative-2",
        level: 2,
        point: "所有格の関係代名詞",
        prompt: "The man ____ car was stolen called the police.",
        choices: ["whose", "who", "which", "whom"],
        answerIndex: 0,
        translation: "車を盗まれた男性が警察に電話した。",
        explanation:
          "「その人の車」という所有関係なので whose を使います。whose +名詞 の形で1つのまとまりになります。",
        choiceNotes: [
          "正解。The man's car was stolen. の the man's にあたります。",
          "who は主格なので、直後に動詞が続きます。",
          "先行詞が人なので which は使えません。",
          "whom は目的格で、あとに主語+動詞が続きます。"
        ]
      },
      {
        id: "relative-3",
        level: 1,
        point: "先行詞を含む what",
        prompt: "That's exactly ____ I wanted to say.",
        choices: ["what", "that", "which", "who"],
        answerIndex: 0,
        translation: "それがまさに私の言いたかったことです。",
        explanation:
          "前に先行詞がなく、「〜こと・もの」という意味のかたまりが必要なので what を使います。the thing which と同じはたらきです。",
        choiceNotes: [
          "正解。what 自体が先行詞を含み、「〜すること」を表します。",
          "that は関係代名詞として使うには先行詞が必要です。",
          "which も先行詞が必要です。",
          "who は人を先行詞にとる関係代名詞です。"
        ]
      },
      {
        id: "relative-4",
        level: 3,
        point: "前置詞+関係代名詞",
        prompt: "He has two sons, both of ____ are doctors.",
        choices: ["whom", "them", "who", "whose"],
        answerIndex: 0,
        translation: "彼には息子が2人いて、2人とも医者だ。",
        explanation:
          "前置詞 of のあとなので目的格の whom を使います。両方の文を1文につなぐには接続詞のはたらきを持つ関係代名詞が必要です。",
        choiceNotes: [
          "正解。both of whom で「そのうちの2人とも」となり、文をつなぎます。",
          "them では接続詞がないまま2文が並ぶことになり、文法的に成立しません。",
          "前置詞のあとに主格の who は置けません。",
          "whose のあとには名詞が続きます。"
        ]
      },
      {
        id: "relative-5",
        level: 3,
        point: "非制限用法の which",
        prompt: "She didn't come to the party, ____ surprised everyone.",
        choices: ["which", "that", "what", "it"],
        answerIndex: 0,
        translation: "彼女はパーティーに来なかったが、そのことが皆を驚かせた。",
        explanation:
          "前の文全体を先行詞にできるのは、コンマ付きの非制限用法の which です。that はこの用法では使えません。",
        choiceNotes: [
          "正解。前の内容全体を受けて「そのことが」を表します。",
          "that は非制限用法（コンマのあと）で使えません。",
          "what は先行詞を含むので、前の文を受ける形になりません。",
          "it では接続詞がなく、2文が並んでしまいます。"
        ]
      },
      {
        id: "relative-6",
        level: 3,
        point: "複合関係形容詞",
        prompt: "You can borrow ____ book you like.",
        choices: ["whichever", "however", "whoever", "whenever"],
        answerIndex: 0,
        translation: "どの本でも好きなものを借りていいですよ。",
        explanation:
          "whichever +名詞で「どの〜でも」という意味になります。あとに名詞 book が続いている点がヒントです。",
        choiceNotes: [
          "正解。whichever book で「どの本でも」を表します。",
          "however は副詞・形容詞を伴い「どんなに〜でも」という意味です。",
          "whoever は人を表し、名詞 book を修飾できません。",
          "whenever は時を表す副詞節を作ります。"
        ]
      }
    ]
  },
  {
    id: "subjunctive",
    order: 9,
    title: "仮定法",
    subtitle: "事実に反する仮定と願望",
    overview:
      "仮定法は「事実と違うこと」を述べる形です。時制を1つ過去にずらすのが特徴で、現在の仮定には過去形、過去の仮定には過去完了形を使います。",
    questions: [
      {
        id: "subjunctive-1",
        level: 1,
        point: "仮定法過去",
        prompt: "If I ____ rich, I would travel around the world.",
        choices: ["were", "am", "will be", "had been"],
        answerIndex: 0,
        translation: "もし私が金持ちなら、世界中を旅するのに。",
        explanation:
          "現在の事実に反する仮定は、if 節で過去形（be動詞は were）、主節で would +原形を使います。",
        choiceNotes: [
          "正解。仮定法過去では主語に関係なく were を使うのが原則です。",
          "現在形では、実際に起こりうる条件（直説法）になってしまいます。",
          "if 節の中に will は入れません。",
          "had been は仮定法過去完了の形で、主節の would travel と時制が合いません。"
        ]
      },
      {
        id: "subjunctive-2",
        level: 2,
        point: "仮定法過去完了",
        prompt: "If I ____ harder, I would have passed the exam.",
        choices: ["had studied", "studied", "have studied", "would study"],
        answerIndex: 0,
        translation: "もっと勉強していたら、試験に合格していただろうに。",
        explanation:
          "過去の事実に反する仮定は、if 節で過去完了、主節で would have +過去分詞を使います。",
        choiceNotes: [
          "正解。主節の would have passed と対応する仮定法過去完了です。",
          "過去形では現在の仮定になり、主節と時制が合いません。",
          "現在完了は仮定法の if 節では使いません。",
          "if 節に would を置くことは通常ありません。"
        ]
      },
      {
        id: "subjunctive-3",
        level: 1,
        point: "I wish +仮定法過去",
        prompt: "I wish I ____ how to swim.",
        choices: ["knew", "know", "have known", "will know"],
        answerIndex: 0,
        translation: "泳ぎ方を知っていたらなあ。",
        explanation:
          "I wish のあとは、現在の事実に反する願望なら過去形を使います。実際には泳げない、という含みがあります。",
        choiceNotes: [
          "正解。今できないことへの願望なので過去形です。",
          "現在形では、事実に反する願望という含みが出ません。",
          "現在完了はこの構文では使いません。",
          "will は wish のあとの仮定法では使いません。"
        ]
      },
      {
        id: "subjunctive-4",
        level: 2,
        point: "as if +仮定法",
        prompt: "He talks as if he ____ everything about the project.",
        choices: ["knew", "knows", "has known", "will know"],
        answerIndex: 0,
        translation: "彼はまるでそのプロジェクトについて何でも知っているかのように話す。",
        explanation:
          "as if のあとで「実際はそうではない」という含みを出すときは、時制を1つずらして過去形にします。",
        choiceNotes: [
          "正解。実際は知らないという含みを持つ仮定法過去です。",
          "現在形にすると、実際に知っていると話し手が認めていることになります。",
          "現在完了ではこの含みを表せません。",
          "will は as if の仮定法では使いません。"
        ]
      },
      {
        id: "subjunctive-5",
        level: 3,
        point: "without を使った仮定",
        prompt: "Without your help, I ____ have finished the report on time.",
        choices: ["couldn't", "can't", "don't", "won't"],
        answerIndex: 0,
        translation: "あなたの助けがなかったら、報告書を期限までに仕上げられなかっただろう。",
        explanation:
          "Without 〜 は if 節の代わりとなり、ここでは過去の事実に反する仮定です。主節は助動詞の過去形+ have +過去分詞になります。",
        choiceNotes: [
          "正解。couldn't have finished で「仕上げられなかっただろう」を表します。",
          "can't have finished は「仕上げたはずがない」という推量になります。",
          "don't have finished という形は成立しません。",
          "won't have finished は未来完了の否定で、過去の仮定になりません。"
        ]
      },
      {
        id: "subjunctive-6",
        level: 3,
        point: "It is time +仮定法過去",
        prompt: "It's almost midnight. It's time you ____ to bed.",
        choices: ["went", "go", "will go", "have gone"],
        answerIndex: 0,
        translation: "もうすぐ真夜中だ。そろそろ寝る時間だよ。",
        explanation:
          "It is time +主語+過去形で「もう〜してもよいころだ（まだしていない）」を表します。仮定法の一種です。",
        choiceNotes: [
          "正解。まだ寝ていないことを前提にした仮定法過去です。",
          "It's time to go to bed. なら正しいですが、主語 you があるので原形は使えません。",
          "この構文で will は使いません。",
          "現在完了ではすでに寝たことになり、意味が通りません。"
        ]
      }
    ]
  },
  {
    id: "comparison",
    order: 10,
    title: "比較",
    subtitle: "比較級・最上級と重要構文",
    overview:
      "比較級は than、最上級は the と組み合わせます。比較級を強めるときは very ではなく much / far を使うなど、日本語から直訳すると間違えやすいポイントが多い分野です。",
    questions: [
      {
        id: "comparison-1",
        level: 1,
        point: "長い形容詞の比較級",
        prompt: "This bag is ____ than that one.",
        choices: ["more expensive", "expensiver", "most expensive", "much expensive"],
        answerIndex: 0,
        translation: "このかばんはあちらのものより高い。",
        explanation:
          "3音節以上の形容詞は -er を付けず、more を前に置いて比較級を作ります。",
        choiceNotes: [
          "正解。expensive のような長い語は more を使います。",
          "expensiver という形は存在しません。",
          "最上級は than とは一緒に使いません。",
          "much expensive は比較級の形になっていません。"
        ]
      },
      {
        id: "comparison-2",
        level: 2,
        point: "比較級の強調",
        prompt: "He is ____ taller than his younger brother.",
        choices: ["much", "very", "so", "more"],
        answerIndex: 0,
        translation: "彼は弟よりずっと背が高い。",
        explanation:
          "比較級を「ずっと」と強めるときは much / far / a lot を使います。very は原級（tall）を強めるときの語です。",
        choiceNotes: [
          "正解。much taller で「ずっと背が高い」となります。",
          "very は比較級を直接修飾できません（very tall なら可）。",
          "so も比較級を修飾できません。",
          "more taller のように比較級を二重にすることはできません。"
        ]
      },
      {
        id: "comparison-3",
        level: 1,
        point: "最上級＋経験",
        prompt: "This is the ____ movie I have ever seen.",
        choices: ["best", "better", "good", "well"],
        answerIndex: 0,
        translation: "これは今まで見た中で一番良い映画だ。",
        explanation:
          "I have ever seen と組み合わせて「今まででいちばん〜」を表すので最上級 best を使います。",
        choiceNotes: [
          "正解。good - better - best の最上級です。",
          "比較級では「今まででいちばん」を表せません。",
          "原級では the とも ever とも噛み合いません。",
          "well は副詞で、名詞 movie を修飾できません。"
        ]
      },
      {
        id: "comparison-4",
        level: 3,
        point: "The 比較級, the 比較級",
        prompt: "The ____ you practice, the better you become.",
        choices: ["more", "most", "much", "many"],
        answerIndex: 0,
        translation: "練習すればするほど、上達する。",
        explanation:
          "The +比較級 …, the +比較級 … で「〜すればするほど…」を表します。後半の the better と形をそろえます。",
        choiceNotes: [
          "正解。the more you practice で「練習すればするほど」となります。",
          "この構文では最上級は使いません。",
          "much は比較級の形になっていません。",
          "many も比較級ではなく、動詞 practice を修飾できません。"
        ]
      },
      {
        id: "comparison-5",
        level: 2,
        point: "比較級で最上級の意味",
        prompt: "Tokyo is larger than ____ city in Japan.",
        choices: ["any other", "any others", "other", "all the"],
        answerIndex: 0,
        translation: "東京は日本のほかのどの都市よりも大きい。",
        explanation:
          "比較級+ than any other +単数名詞で「ほかのどの〜よりも」となり、最上級と同じ意味を表します。",
        choiceNotes: [
          "正解。any other のあとは単数名詞 city です。",
          "any others は代名詞で、名詞 city の前に置けません。",
          "other だけでは限定が不十分で、この構文になりません。",
          "all the cities なら than ではなく別の構文が必要です。"
        ]
      },
      {
        id: "comparison-6",
        level: 3,
        point: "not so much A as B",
        prompt: "She is not so much a singer ____ a dancer.",
        choices: ["as", "than", "but", "like"],
        answerIndex: 0,
        translation: "彼女は歌手というよりむしろダンサーだ。",
        explanation:
          "not so much A as B で「A というよりむしろ B」を表します。B のほうに重点があります。",
        choiceNotes: [
          "正解。so much 〜 as 〜 の対応で結びます。",
          "than は比較級と一緒に使う語です。",
          "but ではこの慣用表現になりません。",
          "like では「〜のように」となり、構文が成立しません。"
        ]
      }
    ]
  }
];

module.exports = { grammarUnits };

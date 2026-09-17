"use strict";

// 高校英文法の問題バンク（2択・根拠つき）。
//
// 出題形式:
//   空所に入る語だけでなく「なぜそれが入るのか」という根拠までセットで選ばせる。
//   不正解の選択肢には、実際に学習者がやりがちな「もっともらしいが誤った根拠」を書く。
//
// variant:
//   "word"   … 語も根拠も異なる2択（基本形）
//   "reason" … 語は同じで根拠だけが異なる2択（根拠を読まないと答えられない）
//
// options は必ず2つ。correct: true はちょうど1つ。表示順は画面側で毎回入れ替える。
// misconception には「誤った根拠のどこが違うのか」を書く。

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
        variant: "word",
        prompt: "Water ____ at 100 degrees Celsius.",
        translation: "水は摂氏100度で沸騰する。",
        options: [
          {
            answer: "boils",
            reason: "いつでも成り立つ事実を述べている文なので、空所には現在形が入るから",
            correct: true
          },
          {
            answer: "is boiling",
            reason: "at 100 degrees と具体的な条件が示されているので、その条件で進行中の動作を表す現在進行形が入るから",
            correct: false
          }
        ],
        explanation:
          "科学的真理や習慣など「いつでも成り立つこと」は現在形で表します。主語 Water は三人称単数扱いなので boils となります。",
        misconception:
          "「具体的な数値があるから進行中の話」という思い込みです。at 100 degrees Celsius は沸騰が起きる条件を示しているだけで、特定の一瞬を指していません。"
      },
      {
        id: "tense-2",
        level: 1,
        point: "過去進行形",
        variant: "word",
        prompt: "I ____ TV when the earthquake hit.",
        translation: "地震が起きたとき、私はテレビを見ていた。",
        options: [
          {
            answer: "was watching",
            reason: "地震が起きた時点で進行中だった背景の動作なので、過去進行形が入るから",
            correct: true
          },
          {
            answer: "watched",
            reason: "when 節の動詞 hit が過去形なので、主節の動詞も同じ過去形にそろえるから",
            correct: false
          }
        ],
        explanation:
          "「〜していた、そこへ…が起きた」という関係では、背景を過去進行形、割り込む出来事を過去形（hit）で表します。",
        misconception:
          "時制をそろえる、という発想で選んでいます。ここで問われているのは形のそろえ方ではなく2つの出来事の関係で、watched だと「見た」という別の一回の動作になり、途中で地震が起きた感じが消えます。"
      },
      {
        id: "tense-3",
        level: 2,
        point: "時の副詞節中の現在形",
        variant: "word",
        prompt: "I'll call you as soon as I ____ home.",
        translation: "家に着いたらすぐに電話します。",
        options: [
          {
            answer: "get",
            reason: "as soon as は時を表す副詞節を作るので、未来の内容でも現在形で表すから",
            correct: true
          },
          {
            answer: "will get",
            reason: "家に着くのはこれから先の出来事なので、未来を表す will が必要だから",
            correct: false
          }
        ],
        explanation:
          "when / as soon as / before / until / if などが作る時・条件の副詞節では、未来のことでも現在形を使います。",
        misconception:
          "「未来のことだから will」と内容だけで判断しています。この文の未来は主節の I'll call がすでに示しており、副詞節の中で重ねて will を使うことはありません。"
      },
      {
        id: "tense-4",
        level: 2,
        point: "過去形と現在完了の区別",
        variant: "word",
        prompt: "She ____ in Osaka for three years when she was a child.",
        translation: "彼女は子どものころ、3年間大阪に住んでいた。",
        options: [
          {
            answer: "lived",
            reason: "when she was a child が今と切り離された過去の一時期を区切っているので、過去形が入るから",
            correct: true
          },
          {
            answer: "has lived",
            reason: "for three years と期間が示されているので、継続を表す現在完了が入るから",
            correct: false
          }
        ],
        explanation:
          "現在完了が使えるのは、その出来事が現在とつながっているときだけです。ここは子ども時代という閉じた過去なので過去形になります。",
        misconception:
          "「for +期間 → 現在完了」という条件反射です。for は過去形とも普通に使えます。決め手は期間の有無ではなく、今とつながっているかどうかです。"
      },
      {
        id: "tense-5",
        level: 2,
        point: "現在進行形",
        variant: "reason",
        prompt: "Look! It ____ outside.",
        translation: "見て！外は雪が降っているよ。",
        options: [
          {
            answer: "is snowing",
            reason: "Look! と今の状況に注意を向けているので、発話の瞬間に進行中であることを表す形にするから",
            correct: true
          },
          {
            answer: "is snowing",
            reason: "天候を表す it が主語の文では、be +-ing の形を使う決まりだから",
            correct: false
          }
        ],
        explanation:
          "語としてはどちらも is snowing ですが、選ぶ理由が違います。現在進行形を選ばせているのは Look!（今見て）という合図です。",
        misconception:
          "「天候の it だから進行形」という規則は存在しません。It snows a lot here.（ここはよく雪が降る）のように現在形も普通に使います。形を決めるのは主語ではなく、今この瞬間の話かどうかです。"
      },
      {
        id: "tense-6",
        level: 3,
        point: "状態動詞は進行形にしない",
        variant: "word",
        prompt: "Sorry, I ____ what you mean.",
        translation: "すみません、おっしゃる意味が分かりません。",
        options: [
          {
            answer: "don't understand",
            reason: "understand は状態を表す動詞で進行形にしないので、今の状態も現在形で表すから",
            correct: true
          },
          {
            answer: "am not understanding",
            reason: "今この瞬間に理解できていないという一時的な状態なので、現在進行形にするから",
            correct: false
          }
        ],
        explanation:
          "understand / know / believe / belong / like などの状態動詞は、今の話でも現在形で表すのが原則です。",
        misconception:
          "「今のことだから進行形」という発想です。進行形にできるのは動作を表す動詞で、状態を表す動詞は現在形のまま「今そうである」ことを表せます。"
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
        variant: "word",
        prompt: "I ____ my key, so I can't get into my room.",
        translation: "鍵をなくしてしまったので、部屋に入れない。",
        options: [
          {
            answer: "have lost",
            reason: "なくした結果が「今入れない」という現在の状態につながっているので、現在完了が入るから",
            correct: true
          },
          {
            answer: "lost",
            reason: "鍵をなくしたのはすでに終わった出来事なので、過去形で表すから",
            correct: false
          }
        ],
        explanation:
          "現在完了の結果用法です。過去の動作が今の状況を作っていることを1つの形で表しています。",
        misconception:
          "「終わったことは過去形」だけで判断しています。過去形は「なくした」で話が終わり、その後見つかった可能性も残るため、so 以下の「だから今入れない」とうまくつながりません。"
      },
      {
        id: "perfect-2",
        level: 1,
        point: "現在完了（継続）",
        variant: "word",
        prompt: "How long ____ each other?",
        translation: "お二人はどのくらいの付き合いですか。",
        options: [
          {
            answer: "have you known",
            reason: "過去のある時点から今まで続いている状態の長さを尋ねているので、現在完了が入るから",
            correct: true
          },
          {
            answer: "have you been knowing",
            reason: "知り合いである状態がずっと続いていることを強調するので、現在完了進行形にするから",
            correct: false
          }
        ],
        explanation:
          "How long 〜? で「今まででどのくらいか」を尋ねるときは現在完了を使います。",
        misconception:
          "「継続を強調するなら進行形」と考えています。know は状態動詞なので進行形にできません。状態動詞の継続は現在完了だけで十分表せます。"
      },
      {
        id: "perfect-3",
        level: 2,
        point: "過去完了（大過去）",
        variant: "word",
        prompt: "When I got to the platform, the train ____.",
        translation: "私がホームに着いたとき、電車はすでに出てしまっていた。",
        options: [
          {
            answer: "had already left",
            reason: "「着いた」という過去の時点よりさらに前に完了していた出来事なので、過去完了が入るから",
            correct: true
          },
          {
            answer: "has already left",
            reason: "already があって「もう出てしまった」という完了を表すので、現在完了が入るから",
            correct: false
          }
        ],
        explanation:
          "過去完了は、過去のある基準時より前に起きたことを表します。ここでの基準は got to the platform です。",
        misconception:
          "already という目印だけで現在完了を選んでいます。already は過去完了でも未来完了でも使えます。基準となる時点が現在なのか過去なのかで形が決まります。"
      },
      {
        id: "perfect-4",
        level: 2,
        point: "have been to と have gone to",
        variant: "word",
        prompt: "She ____ to Canada three times.",
        translation: "彼女はカナダに3回行ったことがある。",
        options: [
          {
            answer: "has been",
            reason: "three times と回数を数えている経験の話なので、have been to（行ったことがある）を使うから",
            correct: true
          },
          {
            answer: "has gone",
            reason: "「行った」という動作を表すので、go の過去分詞 gone を使うから",
            correct: false
          }
        ],
        explanation:
          "have been to 〜 は「〜へ行ったことがある（そして戻っている）」という経験を表します。",
        misconception:
          "単語の意味だけで選ぶと have gone to になりますが、これは「行ってしまって今ここにいない」という意味です。今ここにいない人の経験回数を数えるのは不自然です。"
      },
      {
        id: "perfect-5",
        level: 3,
        point: "未来完了進行形",
        variant: "word",
        prompt: "By next March, I ____ English for ten years.",
        translation: "来年の3月で、私は英語を10年間勉強してきたことになる。",
        options: [
          {
            answer: "will have been studying",
            reason: "By next March が基準の時点を未来に置いているので、そこまでの継続を表す未来完了進行形が入るから",
            correct: true
          },
          {
            answer: "have been studying",
            reason: "今も勉強を続けている最中なので、現在完了進行形が入るから",
            correct: false
          }
        ],
        explanation:
          "未来のある時点までの継続は will have been -ing で表します。「その時点で10年になる」という言い方です。",
        misconception:
          "「今も続いている」という内容に引きずられています。文が基準にしているのは現在ではなく by next March なので、その時点から振り返る形が必要です。"
      },
      {
        id: "perfect-6",
        level: 3,
        point: "since と現在完了",
        variant: "reason",
        prompt: "He ____ for this company since 2015.",
        translation: "彼は2015年からこの会社で働いている。",
        options: [
          {
            answer: "has worked",
            reason: "since 2015 が起点を示し、そこから現在まで続いているので、現在が基準の現在完了にするから",
            correct: true
          },
          {
            answer: "has worked",
            reason: "2015年という過去のはっきりした時点があるので、過去を表す have +過去分詞にするから",
            correct: false
          }
        ],
        explanation:
          "現在完了はあくまで現在が基準の形です。since は「そこから今まで」という起点を示すので相性がよく、期間をひとまとめに表せます。",
        misconception:
          "have +過去分詞を「過去形の別の言い方」と捉えています。過去の一時点を指す語（in 2015, yesterday, when 〜）と現在完了は一緒に使えず、He worked here in 2015. のように過去形になります。since と in の違いが分かれ目です。"
      }
    ]
  },
  {
    id: "modal",
    order: 3,
    title: "助動詞",
    subtitle: "推量・過去の助動詞＋have+過去分詞",
    overview:
      "助動詞は事実ではなく話し手の判断を加えます。must（〜に違いない）と can't（〜のはずがない）のような推量、should have +過去分詞（〜すべきだったのに）のような過去への評価を区別して覚えます。",
    questions: [
      {
        id: "modal-1",
        level: 1,
        point: "must（強い推量）",
        variant: "word",
        prompt: "You ____ be tired after such a long flight.",
        translation: "あんなに長いフライトのあとなら、疲れているに違いないね。",
        options: [
          {
            answer: "must",
            reason: "長いフライトという根拠から「〜に違いない」と断定しているので、確信の強い推量を表す助動詞が入るから",
            correct: true
          },
          {
            answer: "should",
            reason: "「疲れているはずだ」と当然の成り行きを述べているので、should が入るから",
            correct: false
          }
        ],
        explanation:
          "must は義務だけでなく、根拠のある強い推量「〜に違いない」も表します。目の前の相手の状態を推し量る場面の定番です。",
        misconception:
          "should も「〜のはずだ」と推量に使えますが、それは理屈から導かれる予測（The train should be here by now. など）です。相手を見て断定するここでは弱すぎます。"
      },
      {
        id: "modal-2",
        level: 2,
        point: "should have +過去分詞",
        variant: "word",
        prompt: "He ____ have told her the truth, but he lied.",
        translation: "彼は彼女に真実を話すべきだったのに、嘘をついた。",
        options: [
          {
            answer: "should",
            reason: "but he lied から、しなかったことへの非難だと分かるので、should have +過去分詞が入るから",
            correct: true
          },
          {
            answer: "must",
            reason: "過去のことを推量して「話したに違いない」と述べるので、must have +過去分詞が入るから",
            correct: false
          }
        ],
        explanation:
          "should have +過去分詞は「〜すべきだったのに（実際はしなかった）」という後悔・非難を表します。",
        misconception:
          "have +過去分詞という形を見て、自動的に過去の推量だと判断しています。but he lied（実際は嘘をついた）と両立するのは推量ではなく評価のほうです。"
      },
      {
        id: "modal-3",
        level: 1,
        point: "had better",
        variant: "word",
        prompt: "That cough sounds bad. You ____ see a doctor right away.",
        translation: "その咳はよくなさそうだ。すぐ医者に行ったほうがいい。",
        options: [
          {
            answer: "had better",
            reason: "強く勧める言い方で、直後に動詞の原形をそのまま続ける形だから",
            correct: true
          },
          {
            answer: "had better to",
            reason: "「〜したほうがよい」という意味を表すので、better のあとに to 不定詞を続けるから",
            correct: false
          }
        ],
        explanation:
          "had better +動詞の原形で「〜したほうがよい（さもないと困る）」という強めの助言になります。",
        misconception:
          "日本語の「〜すること」を to 不定詞で表そうとしています。had better の better は比較級の副詞で、to は入りません。ought to との混同にも注意します。"
      },
      {
        id: "modal-4",
        level: 2,
        point: "過去の能力 could",
        variant: "reason",
        prompt: "She ____ speak three languages when she was ten.",
        translation: "彼女は10歳のとき、3か国語を話せた。",
        options: [
          {
            answer: "could",
            reason: "when she was ten と過去の時点が示されているので、その時点での能力を表す can の過去形にするから",
            correct: true
          },
          {
            answer: "could",
            reason: "「話すことができた」と控えめに述べる言い方なので、丁寧さを出す could にするから",
            correct: false
          }
        ],
        explanation:
          "ここでの could は単純に can の過去形で、過去に持っていた能力を表します。時制を決めているのは when she was ten です。",
        misconception:
          "Could you help me? のような「控えめ・丁寧の could」と混同しています。丁寧の could は依頼や提案の場面で使うもので、過去の事実を述べるこの文とは別の用法です。"
      },
      {
        id: "modal-5",
        level: 3,
        point: "can't have +過去分詞",
        variant: "word",
        prompt: "You ____ have seen him yesterday; he was in Tokyo all day.",
        translation: "君が昨日彼を見たはずがない。彼は一日中東京にいたのだから。",
        options: [
          {
            answer: "can't",
            reason: "一日中東京にいたという根拠から過去の可能性を否定しているので、can't have +過去分詞が入るから",
            correct: true
          },
          {
            answer: "mustn't",
            reason: "must（〜に違いない）を否定すれば「〜したはずがない」になるので、mustn't have +過去分詞にするから",
            correct: false
          }
        ],
        explanation:
          "can't have +過去分詞は「〜したはずがない」。must have +過去分詞（〜したに違いない）のちょうど反対の意味になります。",
        misconception:
          "must を否定すれば推量の否定になる、と考えています。mustn't は「〜してはいけない」という禁止で、推量の否定には使いません。推量の否定は can't が担当します。"
      },
      {
        id: "modal-6",
        level: 3,
        point: "needn't have +過去分詞",
        variant: "word",
        prompt: "You ____ have worried. Everything went well.",
        translation: "心配する必要はなかったんだよ。全部うまくいった。",
        options: [
          {
            answer: "needn't",
            reason: "実際には心配したが、その必要はなかったと伝えているので、needn't have +過去分詞が入るから",
            correct: true
          },
          {
            answer: "couldn't",
            reason: "「〜できなかった」ではなく過去の話をしているので、can の否定形に have +過去分詞を続けるから",
            correct: false
          }
        ],
        explanation:
          "needn't have +過去分詞は「〜する必要はなかったのに（実際はした）」という取り越し苦労を表します。",
        misconception:
          "couldn't have +過去分詞は「〜したはずがない／〜できなかっただろう」で、必要性の話ではありません。ここは相手が心配したことが前提なので、必要の有無を表す need の否定を使います。"
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
        variant: "word",
        prompt: "This temple ____ in 1397.",
        translation: "この寺は1397年に建てられた。",
        options: [
          {
            answer: "was built",
            reason: "寺は「建てられる」側で、in 1397 と過去の時点が示されているので、be動詞の過去形+過去分詞になるから",
            correct: true
          },
          {
            answer: "built",
            reason: "「建てられた」という過去の出来事なので、build の過去形一語で表せるから",
            correct: false
          }
        ],
        explanation:
          "受動態は be動詞+過去分詞が必ずセットです。be動詞が時制を担当し、過去分詞が「される」という関係を担当します。",
        misconception:
          "日本語の「建てられた」を過去形一語に置き換えています。built だけだと「この寺が（何かを）建てた」という能動の意味になってしまいます。"
      },
      {
        id: "passive-2",
        level: 2,
        point: "進行形の受動態",
        variant: "word",
        prompt: "The road ____ repaired now, so we have to take a detour.",
        translation: "その道路は今修理中なので、迂回しなければならない。",
        options: [
          {
            answer: "is being",
            reason: "now とあり「今まさに修理されている最中」なので、進行形の受動態 be being +過去分詞にするから",
            correct: true
          },
          {
            answer: "is",
            reason: "道路が修理されるという受け身なので、be動詞+過去分詞で表すから",
            correct: false
          }
        ],
        explanation:
          "作業が進行中であることを表すには being が要ります。is being repaired で「修理されている最中」です。",
        misconception:
          "is repaired も受動態ですが、それは「修理される（一般的な事実）」や「修理された状態だ」という意味で、作業の最中であることは表せません。so 以下の迂回の理由になりません。"
      },
      {
        id: "passive-3",
        level: 2,
        point: "群動詞の受動態",
        variant: "word",
        prompt: "He was laughed ____ by everyone in the room.",
        translation: "彼は部屋にいた全員に笑われた。",
        options: [
          {
            answer: "at",
            reason: "能動態 Everyone laughed at him. の laugh at がひとまとまりの動詞なので、受動態でも前置詞がそのまま残るから",
            correct: true
          },
          {
            answer: "to",
            reason: "受動態では動作が向かう相手を示す必要があるので、方向を表す to を使うから",
            correct: false
          }
        ],
        explanation:
          "laugh at / speak to / look after のような群動詞は、全体で1つの動詞として扱い、受動態でも前置詞を落としません。",
        misconception:
          "受け身になると前置詞が変わる、という思い込みです。変わるのは主語の位置だけで、動詞とセットの前置詞はそのまま残ります。"
      },
      {
        id: "passive-4",
        level: 2,
        point: "未来の受動態",
        variant: "reason",
        prompt: "The package ____ delivered by tomorrow evening.",
        translation: "荷物は明日の夕方までに配達されるだろう。",
        options: [
          {
            answer: "will be",
            reason: "未来に「配達される」という受け身なので、will のあとに be +過去分詞を続けるから",
            correct: true
          },
          {
            answer: "will be",
            reason: "by tomorrow evening という期限があるので、完了を表す形にするから",
            correct: false
          }
        ],
        explanation:
          "will be +過去分詞は「これから〜される」という未来の受動態です。助動詞のあとなので be は必ず原形になります。",
        misconception:
          "be +過去分詞を完了の形だと取り違えています。完了を強調したいなら will have been delivered という別の形になります。by 〜 という期限があっても、受動態の基本形が変わるわけではありません。"
      },
      {
        id: "passive-5",
        level: 3,
        point: "be said to +動詞の原形",
        variant: "word",
        prompt: "She is said ____ one of the best pianists of her time.",
        translation: "彼女は当時最高のピアニストの一人だと言われている。",
        options: [
          {
            answer: "to be",
            reason: "They say that she is 〜 を受動態にした形で、be said のあとには to 不定詞が続くから",
            correct: true
          },
          {
            answer: "being",
            reason: "say のあとの内容を名詞のかたまりにするので、動名詞 being にするから",
            correct: false
          }
        ],
        explanation:
          "be said / be believed / be thought などのあとは to 不定詞を続けます。It is said that she is 〜 と書き換えられます。",
        misconception:
          "「〜であること」を動名詞で表そうとしています。said は動名詞を続けられず、この構文では to 不定詞と決まっています。"
      },
      {
        id: "passive-6",
        level: 2,
        point: "have +目的語+過去分詞（被害）",
        variant: "word",
        prompt: "I had my wallet ____ on the train yesterday.",
        translation: "私は昨日、電車で財布を盗まれた。",
        options: [
          {
            answer: "stolen",
            reason: "my wallet は「盗まれる」側なので、have +目的語+過去分詞の形になるから",
            correct: true
          },
          {
            answer: "stealing",
            reason: "盗みが起きたという出来事を表すので、have +目的語+現在分詞にするから",
            correct: false
          }
        ],
        explanation:
          "have +目的語+過去分詞は「〜される（被害）」または「〜してもらう」を表します。どちらかは文脈で決まります。",
        misconception:
          "目的語と動詞の関係を確かめていません。現在分詞にすると「財布が盗んでいる」という能動の関係になってしまいます。"
      }
    ]
  },
  {
    id: "infinitive",
    order: 5,
    title: "不定詞",
    subtitle: "to +動詞の原形と原形不定詞",
    overview:
      "to 不定詞は名詞・形容詞・副詞のはたらきをします。目的（〜するために）、程度（〜するほど）、結果（そして〜した）など副詞用法の幅が広いのが特徴です。make / let / have などのあとでは to のない原形不定詞を使います。",
    questions: [
      {
        id: "infinitive-1",
        level: 1,
        point: "want +目的語+ to 不定詞",
        variant: "word",
        prompt: "I want you ____ this letter before you leave.",
        translation: "出かける前に、この手紙を読んでほしい。",
        options: [
          {
            answer: "to read",
            reason: "want は「人に〜してほしい」を want +目的語+ to 不定詞の形で表す動詞だから",
            correct: true
          },
          {
            answer: "read",
            reason: "目的語 you のあとに動作が続く形なので、原形不定詞にするから",
            correct: false
          }
        ],
        explanation:
          "want / ask / tell / advise / allow などは「目的語+ to 不定詞」をとります。you が read の意味上の主語です。",
        misconception:
          "原形不定詞を続けられるのは make / let / have（使役）と see / hear / feel（知覚）などに限られます。want はその仲間ではないので to が必要です。"
      },
      {
        id: "infinitive-2",
        level: 1,
        point: "形式主語 It と to 不定詞",
        variant: "word",
        prompt: "It is important ____ enough sleep before an exam.",
        translation: "試験の前には十分な睡眠をとることが大切だ。",
        options: [
          {
            answer: "to get",
            reason: "It が形式主語で、本当の主語を to 不定詞にして後ろに置く形だから",
            correct: true
          },
          {
            answer: "getting",
            reason: "「十分な睡眠をとること」という名詞のかたまりを作るので、動名詞にするから",
            correct: false
          }
        ],
        explanation:
          "It is +形容詞+ to do は、長い主語を後ろに回すための形です。It の中身が to get enough sleep になります。",
        misconception:
          "動名詞でも「〜すること」を表せますが、形式主語 It が指す中身として置くのは to 不定詞です。動名詞を使うなら Getting enough sleep is important. と主語の位置に出します。"
      },
      {
        id: "infinitive-3",
        level: 2,
        point: "enough to do（程度）",
        variant: "reason",
        prompt: "She was kind enough ____ me the way to the station.",
        translation: "彼女は親切に駅への道を教えてくれた。",
        options: [
          {
            answer: "to show",
            reason: "kind enough to do で「〜するほど親切だ」となり、enough とセットで程度を表す形だから",
            correct: true
          },
          {
            answer: "to show",
            reason: "道を教えるために親切にしたので、目的を表す to 不定詞が入るから",
            correct: false
          }
        ],
        explanation:
          "形容詞+ enough to do は程度を表す決まった形です。訳すときは「親切にも〜してくれた」とすると自然になります。",
        misconception:
          "to 不定詞を見るとすぐ「〜するために」と目的に取ってしまう誤りです。enough があるかどうかが手がかりで、ここは「道を教えるほど親切だった」という程度の話です。"
      },
      {
        id: "infinitive-4",
        level: 3,
        point: "完了不定詞",
        variant: "word",
        prompt: "He seems ____ been ill while he was abroad.",
        translation: "彼は海外にいるあいだ病気だったようだ。",
        options: [
          {
            answer: "to have",
            reason: "病気だったのは seems より前のことなので、to have +過去分詞（完了不定詞）で時のずれを表すから",
            correct: true
          },
          {
            answer: "to",
            reason: "seem のあとには to 不定詞が続くので、to のあとに過去分詞を置くから",
            correct: false
          }
        ],
        explanation:
          "It seems that he was ill 〜 と同じ内容です。不定詞で「主節より前」を表すときは to have +過去分詞にします。",
        misconception:
          "to のあとに過去分詞を直接置く形（to been）は存在しません。to のあとは必ず原形で、時のずれは have を挟んで表します。"
      },
      {
        id: "infinitive-5",
        level: 2,
        point: "疑問詞+ to 不定詞",
        variant: "word",
        prompt: "I don't know what ____ in this situation.",
        translation: "この状況で何をすべきか分からない。",
        options: [
          {
            answer: "to do",
            reason: "疑問詞+ to 不定詞で「何を〜すべきか」という名詞のかたまりを作り、know の目的語になるから",
            correct: true
          },
          {
            answer: "to doing",
            reason: "前置詞 to のあとなので、動名詞を続けるから",
            correct: false
          }
        ],
        explanation:
          "what to do / how to use / where to go などは名詞のはたらきをして、動詞の目的語になれます。",
        misconception:
          "look forward to のような前置詞の to と混同しています。ここの to は不定詞を作る to なので、あとには原形が続きます。"
      },
      {
        id: "infinitive-6",
        level: 2,
        point: "原形不定詞（使役動詞 make）",
        variant: "word",
        prompt: "The teacher made us ____ the whole poem.",
        translation: "先生は私たちに詩を全部暗記させた。",
        options: [
          {
            answer: "memorize",
            reason: "make は使役動詞で、目的語のあとに to のない原形不定詞が続くから",
            correct: true
          },
          {
            answer: "to memorize",
            reason: "「私たちに暗記させる」と人に動作をさせる意味なので、目的語+ to 不定詞にするから",
            correct: false
          }
        ],
        explanation:
          "make / let / have +目的語+原形が使役の基本形です。受動態にすると were made to memorize と to が現れます。",
        misconception:
          "意味が同じでも動詞ごとに形が決まっています。ask / tell / want は to 不定詞、make / let / have は原形、と動詞で覚え分けます。"
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
        variant: "word",
        prompt: "I'm looking forward to ____ you again next spring.",
        translation: "来春またお会いできるのを楽しみにしています。",
        options: [
          {
            answer: "seeing",
            reason: "look forward to の to は前置詞なので、空所には動名詞が入るから",
            correct: true
          },
          {
            answer: "see",
            reason: "to は不定詞を作る語なので、空所には動詞の原形が入るから",
            correct: false
          }
        ],
        explanation:
          "to が前置詞か不定詞の目印かを見分けるのがこの問題の核心です。look forward to the party のように名詞を置けるなら前置詞です。",
        misconception:
          "to を見たら不定詞、と決めてしまう誤りです。be used to / object to / devote oneself to なども前置詞の to で、あとには動名詞が続きます。"
      },
      {
        id: "gerund-2",
        level: 1,
        point: "動名詞のみを目的語にとる動詞",
        variant: "word",
        prompt: "He carefully avoided ____ my question.",
        translation: "彼は私の質問に答えるのを巧みに避けた。",
        options: [
          {
            answer: "answering",
            reason: "avoid は動名詞だけを目的語にとる動詞だから",
            correct: true
          },
          {
            answer: "to answer",
            reason: "これからしようとする行為を避けるという意味なので、未来に向かう to 不定詞が入るから",
            correct: false
          }
        ],
        explanation:
          "avoid / enjoy / finish / give up / practice / mind などは動名詞だけを目的語にとります。動詞ごとに形で覚えます。",
        misconception:
          "意味から不定詞を選んでいます。確かに to 不定詞は「これから」を表しやすいのですが、どちらをとるかは動詞ごとに決まっていて、意味で選べるわけではありません。"
      },
      {
        id: "gerund-3",
        level: 1,
        point: "Do you mind -ing",
        variant: "word",
        prompt: "It's getting cold. Do you mind ____ the window?",
        translation: "寒くなってきました。窓を閉めていただけますか。",
        options: [
          {
            answer: "closing",
            reason: "mind は動名詞を目的語にとり、Do you mind -ing? で丁寧な依頼になるから",
            correct: true
          },
          {
            answer: "to close",
            reason: "これから閉めてほしいと頼んでいるので、to 不定詞にするから",
            correct: false
          }
        ],
        explanation:
          "Do you mind -ing? は直訳すると「〜するのを気にしますか」で、断るときは Yes（気にします）になる点にも注意します。",
        misconception:
          "依頼だから未来のこと、と考えて不定詞を選んでいます。mind は形の上で動名詞しかとらないので、意味に関係なく -ing になります。"
      },
      {
        id: "gerund-4",
        level: 2,
        point: "remember -ing と remember to do",
        variant: "word",
        prompt: "I remember ____ him at the conference two years ago.",
        translation: "2年前の学会で彼に会ったのを覚えている。",
        options: [
          {
            answer: "meeting",
            reason: "two years ago とあり、すでに起きたことを覚えている意味なので remember -ing にするから",
            correct: true
          },
          {
            answer: "to meet",
            reason: "remember のあとは to 不定詞を続けて「会うことを覚えている」とするから",
            correct: false
          }
        ],
        explanation:
          "remember / forget / try / stop は、-ing と to 不定詞で意味が変わる代表的な動詞です。",
        misconception:
          "remember to do は「これから〜するのを忘れない」という意味で、two years ago とは両立しません。過去の出来事の記憶は -ing です。"
      },
      {
        id: "gerund-5",
        level: 3,
        point: "It is no use -ing",
        variant: "reason",
        prompt: "It is no use ____ over spilt milk.",
        translation: "こぼれたミルクを嘆いても仕方がない（覆水盆に返らず）。",
        options: [
          {
            answer: "crying",
            reason: "It is no use -ing で「〜しても無駄だ」という決まった形だから",
            correct: true
          },
          {
            answer: "crying",
            reason: "直前の use が名詞なので、名詞のあとには動名詞しか置けないから",
            correct: false
          }
        ],
        explanation:
          "It is no use -ing のほか、There is no -ing（〜できない）、It is worth -ing（〜する価値がある）など、動名詞を含む慣用表現はまとめて覚えます。",
        misconception:
          "「名詞のあとだから動名詞」という規則は存在しません（a plan to go abroad のように名詞のあとに不定詞が来る形もあります）。もっともらしい説明でも、規則として成り立つかを確かめる必要があります。"
      },
      {
        id: "gerund-6",
        level: 2,
        point: "be used to -ing",
        variant: "word",
        prompt: "I'm not used to ____ up so early in the morning.",
        translation: "私はこんなに朝早く起きるのに慣れていない。",
        options: [
          {
            answer: "getting",
            reason: "be used to の to は前置詞なので、あとには動名詞が続くから",
            correct: true
          },
          {
            answer: "get",
            reason: "used to +動詞の原形で「以前はよく〜した」という形になるから",
            correct: false
          }
        ],
        explanation:
          "be used to -ing（〜に慣れている）と used to +原形（以前はよく〜した）は、直前に be動詞があるかどうかで見分けます。",
        misconception:
          "used to という並びだけを見て過去の習慣と判断しています。この文には I'm という be動詞があるので「慣れている」のほうです。"
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
        variant: "word",
        prompt: "The boy ____ on the bench is my brother.",
        translation: "ベンチに座っている少年は私の弟だ。",
        options: [
          {
            answer: "sitting",
            reason: "the boy と sit の関係が「少年が座っている」という能動なので、現在分詞で後ろから修飾するから",
            correct: true
          },
          {
            answer: "sat",
            reason: "すでに座っている状態を表すので、完了した状態を示す過去分詞で修飾するから",
            correct: false
          }
        ],
        explanation:
          "who is sitting on the bench を短くした形です。2語以上の分詞句は名詞の後ろに置きます。",
        misconception:
          "過去分詞は「〜される・された」という受動の関係のときに使います。少年は自分で座っているので、状態が続いていても現在分詞です。"
      },
      {
        id: "participle-2",
        level: 1,
        point: "過去分詞の後置修飾",
        variant: "word",
        prompt: "I found a book ____ in simple English.",
        translation: "やさしい英語で書かれた本を見つけた。",
        options: [
          {
            answer: "written",
            reason: "a book と write の関係が「本が書かれる」という受動なので、過去分詞で修飾するから",
            correct: true
          },
          {
            answer: "writing",
            reason: "日本語の「やさしい英語で書いてある本」は能動の言い方なので、現在分詞にするから",
            correct: false
          }
        ],
        explanation:
          "which was written in simple English と同じ意味です。修飾される名詞と分詞の関係が受動なら過去分詞になります。",
        misconception:
          "日本語の「書いてある」という言い方に引きずられています。英語では本が自分で書くわけではないので、必ず受動の関係になります。"
      },
      {
        id: "participle-3",
        level: 2,
        point: "受動の分詞構文",
        variant: "word",
        prompt: "____ from the plane, the islands looked like green stones.",
        translation: "飛行機から見ると、その島々は緑の石のように見えた。",
        options: [
          {
            answer: "Seen",
            reason: "分詞構文の意味上の主語は主節の主語 the islands で、島々は「見られる」側だから",
            correct: true
          },
          {
            answer: "Seeing",
            reason: "飛行機から見たときの話なので、見るという動作を表す現在分詞で始めるから",
            correct: false
          }
        ],
        explanation:
          "When they were seen from the plane を短くした形です。受動の関係なので過去分詞で始めます。",
        misconception:
          "「誰が見たか」を主語だと思って現在分詞を選んでいます。分詞構文の意味上の主語は主節の主語と同じなので、Seeing だと「島々が見た」ことになります。"
      },
      {
        id: "participle-4",
        level: 2,
        point: "理由を表す分詞構文",
        variant: "reason",
        prompt: "____ very tired, she went to bed without eating dinner.",
        translation: "とても疲れていたので、彼女は夕食も食べずに寝た。",
        options: [
          {
            answer: "Being",
            reason: "Because she was very tired の接続詞と主語を省いた形で、残った be動詞を分詞にするから",
            correct: true
          },
          {
            answer: "Being",
            reason: "自分の意志で早く寝たので、主語の意志を表す分詞構文にするから",
            correct: false
          }
        ],
        explanation:
          "分詞構文は接続詞と主語を省いて簡潔にする形です。ここでは理由を表し、Being は省略して Very tired, she went 〜 とも書けます。",
        misconception:
          "分詞構文に「意志を表す」という用法はありません。表すのは時・理由・条件・譲歩・付帯状況で、どれかは文脈から判断します。"
      },
      {
        id: "participle-5",
        level: 1,
        point: "分詞句による修飾",
        variant: "word",
        prompt: "There was a girl ____ a red hat at the door.",
        translation: "ドアのところに赤い帽子をかぶった女の子がいた。",
        options: [
          {
            answer: "wearing",
            reason: "分詞が修飾するのは直前の a girl で、女の子が「かぶっている」という能動の関係だから",
            correct: true
          },
          {
            answer: "worn",
            reason: "帽子はかぶられる側なので、過去分詞にするから",
            correct: false
          }
        ],
        explanation:
          "who was wearing a red hat を短くした形です。分詞句は修飾する名詞の直後に置かれます。",
        misconception:
          "分詞の後ろにある a red hat と関係を結んでいます。判断すべきなのは分詞が修飾する名詞（a girl）との関係です。"
      },
      {
        id: "participle-6",
        level: 3,
        point: "独立分詞構文",
        variant: "word",
        prompt: "____ no bus at that hour, we had to walk home.",
        translation: "その時間にはバスがなかったので、私たちは歩いて帰らなければならなかった。",
        options: [
          {
            answer: "There being",
            reason: "As there was no bus を分詞構文にした形で、there is 構文の there はそのまま前に残るから",
            correct: true
          },
          {
            answer: "Being there",
            reason: "分詞構文は分詞で始めるのが決まりなので、Being を文頭に出すから",
            correct: false
          }
        ],
        explanation:
          "主節の主語（we）と分詞構文の主語（there）が違うため、there を残す独立分詞構文になります。",
        misconception:
          "「分詞で始める」という形だけを守ろうとしています。there is 構文では there が主語の位置にあるので、意味上の主語として前に残します。"
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
        variant: "word",
        prompt: "This is the house ____ I was born.",
        translation: "ここが私の生まれた家です。",
        options: [
          {
            answer: "where",
            reason: "あとに I was born という欠けのない文が続いているので、関係副詞が入るから",
            correct: true
          },
          {
            answer: "which",
            reason: "先行詞 the house が「もの」なので、ものを受ける関係代名詞 which が入るから",
            correct: false
          }
        ],
        explanation:
          "where は in which と書き換えられます。あとの文が完全かどうかが、関係代名詞と関係副詞の分かれ目です。",
        misconception:
          "先行詞の種類だけで決めています。which を使うなら which I was born in と前置詞が必要で、そのままでは文が余ってしまいます。"
      },
      {
        id: "relative-2",
        level: 2,
        point: "所有格の関係代名詞",
        variant: "word",
        prompt: "The man ____ car was stolen called the police.",
        translation: "車を盗まれた男性が警察に電話した。",
        options: [
          {
            answer: "whose",
            reason: "「その男性の車」という所有の関係で、直後に名詞 car が続いているから",
            correct: true
          },
          {
            answer: "who",
            reason: "先行詞が人なので、人を受ける関係代名詞 who が入るから",
            correct: false
          }
        ],
        explanation:
          "The man's car was stolen. の the man's にあたるのが whose です。whose +名詞で1つのまとまりを作ります。",
        misconception:
          "人かものかだけで判断しています。who は主格なので直後に動詞が来ます。ここは car という名詞が続くので所有格です。"
      },
      {
        id: "relative-3",
        level: 1,
        point: "先行詞を含む what",
        variant: "word",
        prompt: "That's exactly ____ I wanted to say.",
        translation: "それがまさに私の言いたかったことです。",
        options: [
          {
            answer: "what",
            reason: "前に先行詞がなく、「〜こと」という意味まで含んだ関係代名詞が必要だから",
            correct: true
          },
          {
            answer: "which",
            reason: "文頭の That を先行詞として受けるので、which が入るから",
            correct: false
          }
        ],
        explanation:
          "what は the thing which と同じはたらきで、それ自体が先行詞を含みます。",
        misconception:
          "That を先行詞と見なしています。That は「それ」と指すだけの主語で、説明される名詞ではありません。先行詞がない位置で使えるのは what です。"
      },
      {
        id: "relative-4",
        level: 3,
        point: "前置詞+関係代名詞",
        variant: "word",
        prompt: "He has two sons, both of ____ are doctors.",
        translation: "彼には息子が2人いて、2人とも医者だ。",
        options: [
          {
            answer: "whom",
            reason: "前置詞 of の目的語であり、同時に2つの文をつなぐはたらきも必要なので、目的格の関係代名詞が入るから",
            correct: true
          },
          {
            answer: "them",
            reason: "both of them で「そのうちの2人とも」という意味になるから",
            correct: false
          }
        ],
        explanation:
          "both of whom / some of which / the top of which など、前置詞+関係代名詞は1文にまとめるときの定番の形です。",
        misconception:
          "意味は通りますが、them には接続詞のはたらきがありません。接続詞なしで文を2つ並べることはできないので、関係代名詞が必要です。"
      },
      {
        id: "relative-5",
        level: 3,
        point: "非制限用法の which",
        variant: "reason",
        prompt: "She didn't come to the party, ____ surprised everyone.",
        translation: "彼女はパーティーに来なかったが、そのことが皆を驚かせた。",
        options: [
          {
            answer: "which",
            reason: "驚かせたのは前の文の内容全体なので、コンマのあとで内容全体を受けられる非制限用法の which を使うから",
            correct: true
          },
          {
            answer: "which",
            reason: "surprised の主語になる名詞が必要で、直前の the party を先行詞として受けるから",
            correct: false
          }
        ],
        explanation:
          "コンマ+ which は、直前の名詞だけでなく前の文の内容全体を先行詞にできます。この用法で that は使えません。",
        misconception:
          "関係詞は必ず直前の名詞を受ける、と考えています。皆を驚かせたのはパーティーではなく「彼女が来なかったこと」です。何が驚きの原因かを考えると先行詞が決まります。"
      },
      {
        id: "relative-6",
        level: 3,
        point: "複合関係形容詞",
        variant: "word",
        prompt: "You can borrow ____ book you like.",
        translation: "どの本でも好きなものを借りていいですよ。",
        options: [
          {
            answer: "whichever",
            reason: "直後に名詞 book が続き、「どの〜でも」と名詞を修飾しているから",
            correct: true
          },
          {
            answer: "however",
            reason: "「どんなに好きな本でも」と程度を表しているから",
            correct: false
          }
        ],
        explanation:
          "whichever +名詞で「どの〜でも」。複合関係詞は -ever の形で「〜でも」という意味を加えます。",
        misconception:
          "however は however difficult it is のように形容詞・副詞を伴って「どんなに〜でも」を表す語で、名詞を直接修飾することはできません。"
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
        variant: "word",
        prompt: "If I ____ rich, I would travel around the world.",
        translation: "もし私が金持ちなら、世界中を旅するのに。",
        options: [
          {
            answer: "were",
            reason: "主節が would +原形なので、現在の事実に反する仮定を表す仮定法過去にそろえるから",
            correct: true
          },
          {
            answer: "am",
            reason: "今の自分についての条件を述べているので、現在形にするから",
            correct: false
          }
        ],
        explanation:
          "仮定法過去では、if 節で過去形（be動詞は原則 were）、主節で would / could / might +原形を使います。",
        misconception:
          "If I am rich, I will travel 〜 なら「実際にありうる条件」を表す普通の文になります。主節が would である以上、事実に反する仮定として時制をずらす必要があります。"
      },
      {
        id: "subjunctive-2",
        level: 2,
        point: "仮定法過去完了",
        variant: "word",
        prompt: "If I ____ harder, I would have passed the exam.",
        translation: "もっと勉強していたら、試験に合格していただろうに。",
        options: [
          {
            answer: "had studied",
            reason: "主節が would have +過去分詞なので、過去の事実に反する仮定を表す過去完了にそろえるから",
            correct: true
          },
          {
            answer: "studied",
            reason: "勉強したかどうかは過去の話なので、if 節を過去形にするから",
            correct: false
          }
        ],
        explanation:
          "仮定法では時制を1つずらします。現在の仮定なら過去形、過去の仮定なら過去完了です。",
        misconception:
          "内容の時（過去のこと）とそのまま形を合わせています。仮定法ではもう1つ過去にずらすため、過去の話は過去完了になります。studied だと現在の仮定になり、主節と噛み合いません。"
      },
      {
        id: "subjunctive-3",
        level: 1,
        point: "I wish +仮定法過去",
        variant: "word",
        prompt: "I wish I ____ how to swim.",
        translation: "泳ぎ方を知っていたらなあ。",
        options: [
          {
            answer: "knew",
            reason: "実際には泳げないという、現在の事実に反する願望なので過去形にするから",
            correct: true
          },
          {
            answer: "know",
            reason: "今そうであってほしいという現在の願望なので、現在形にするから",
            correct: false
          }
        ],
        explanation:
          "I wish のあとは、現在の願望でも1つ過去にずらします。このずれ自体が「実際はそうではない」という合図になります。",
        misconception:
          "願望の内容が現在のことなら現在形、と考えています。I hope なら現在形も使えますが、I wish は事実に反する願望なので時制をずらします。"
      },
      {
        id: "subjunctive-4",
        level: 2,
        point: "as if +仮定法",
        variant: "word",
        prompt: "He talks as if he ____ everything about the project.",
        translation: "彼はまるでそのプロジェクトについて何でも知っているかのように話す。",
        options: [
          {
            answer: "knew",
            reason: "実際は知らないという含みを出すため、時制を1つずらして過去形にするから",
            correct: true
          },
          {
            answer: "knows",
            reason: "主節 He talks が現在形なので、as if 節も時制をそろえて現在形にするから",
            correct: false
          }
        ],
        explanation:
          "as if のあとを過去形にすると「実際はそうではないのに」という含みが出ます。事実として認めるなら現在形も使えます。",
        misconception:
          "時制の一致で決めようとしています。ここで形を決めるのは主節の時制ではなく、その内容を事実と見なすかどうかです。"
      },
      {
        id: "subjunctive-5",
        level: 3,
        point: "without を使った仮定",
        variant: "reason",
        prompt: "Without your help, I ____ have finished the report on time.",
        translation: "あなたの助けがなかったら、報告書を期限までに仕上げられなかっただろう。",
        options: [
          {
            answer: "couldn't",
            reason: "Without 〜 が過去の事実に反する if 節の代わりなので、主節は助動詞の過去形+ have +過去分詞にするから",
            correct: true
          },
          {
            answer: "couldn't",
            reason: "「仕上げられなかった」という過去の事実を述べるので、can の否定形に have +過去分詞を続けるから",
            correct: false
          }
        ],
        explanation:
          "Without 〜 / But for 〜 は if 節の代わりになります。If it had not been for your help と書き換えられます。",
        misconception:
          "実際には助けてもらえて、報告書は仕上がっています。事実を述べているのではなく「もし助けがなかったら」という仮定なので、訳も「〜できなかっただろう」になります。"
      },
      {
        id: "subjunctive-6",
        level: 3,
        point: "It is time +仮定法過去",
        variant: "word",
        prompt: "It's almost midnight. It's time you ____ to bed.",
        translation: "もうすぐ真夜中だ。そろそろ寝る時間だよ。",
        options: [
          {
            answer: "went",
            reason: "It is time +主語+過去形で「もう〜してもよいころだ」を表す形だから",
            correct: true
          },
          {
            answer: "go",
            reason: "これから寝るという今の話なので、現在形にするから",
            correct: false
          }
        ],
        explanation:
          "It's time to go to bed. なら to 不定詞ですが、主語 you を立てるときは過去形（仮定法）にします。「まだ寝ていない」という含みが出ます。",
        misconception:
          "内容が現在・未来のことなので現在形を選んでいます。この構文では、まだ実現していないことを表すために時制を1つずらすのが決まりです。"
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
        variant: "word",
        prompt: "This bag is ____ than that one.",
        translation: "このかばんはあちらのものより高い。",
        options: [
          {
            answer: "more expensive",
            reason: "expensive は音節の多い語なので、-er ではなく more を前に置いて比較級を作るから",
            correct: true
          },
          {
            answer: "expensiver",
            reason: "than があって比較を表すので、形容詞に -er を付けて比較級にするから",
            correct: false
          }
        ],
        explanation:
          "比較級の作り方は語の長さで決まります。短い語は -er、長い語（expensive / beautiful / important など）は more です。",
        misconception:
          "than があるから -er、と機械的に処理しています。than は比較の相手を示すだけで、比較級の作り方までは決めません。"
      },
      {
        id: "comparison-2",
        level: 2,
        point: "比較級の強調",
        variant: "word",
        prompt: "He is ____ taller than his younger brother.",
        translation: "彼は弟よりずっと背が高い。",
        options: [
          {
            answer: "much",
            reason: "比較級 taller を「ずっと」と強めるので、比較級を修飾できる much を使うから",
            correct: true
          },
          {
            answer: "very",
            reason: "「とても背が高い」と程度を強めるので、強調の very を使うから",
            correct: false
          }
        ],
        explanation:
          "比較級を強めるのは much / far / a lot / even。very は原級（very tall）を強める語です。",
        misconception:
          "日本語の「とても」「ずっと」をどちらも very で置き換えています。強調する相手が原級か比較級かで語が変わります。"
      },
      {
        id: "comparison-3",
        level: 2,
        point: "最上級＋経験",
        variant: "reason",
        prompt: "This is the ____ movie I have ever seen.",
        translation: "これは今まで見た中で一番良い映画だ。",
        options: [
          {
            answer: "best",
            reason: "I have ever seen が「今まで見たすべての中で」という範囲を示しているので、最上級にするから",
            correct: true
          },
          {
            answer: "best",
            reason: "直前に the が付いているので、the のあとは必ず最上級になるから",
            correct: false
          }
        ],
        explanation:
          "最上級は「ある範囲の中で一番」を表す形です。ここでの範囲は I have ever seen（今まで見た中で）です。",
        misconception:
          "the があれば最上級、という形だけの判断です。the better of the two（2つのうちの良いほう）のように、the +比較級という形も存在します。範囲を示す語句で判断します。"
      },
      {
        id: "comparison-4",
        level: 3,
        point: "The 比較級, the 比較級",
        variant: "word",
        prompt: "The ____ you practice, the better you become.",
        translation: "練習すればするほど、上達する。",
        options: [
          {
            answer: "more",
            reason: "The +比較級 …, the +比較級 … の形なので、後半の the better と同じく比較級にそろえるから",
            correct: true
          },
          {
            answer: "most",
            reason: "「最も練習する」と程度が最大であることを表すので、最上級にするから",
            correct: false
          }
        ],
        explanation:
          "The +比較級 …, the +比較級 … は「〜すればするほど…」を表す構文で、前後とも比較級になります。",
        misconception:
          "the が付いているので最上級だと考えています。この構文の the は最上級の the とは別もので、2つの変化が連動することを示しています。"
      },
      {
        id: "comparison-5",
        level: 2,
        point: "比較級で最上級の意味",
        variant: "word",
        prompt: "Tokyo is larger than ____ city in Japan.",
        translation: "東京は日本のほかのどの都市よりも大きい。",
        options: [
          {
            answer: "any other",
            reason: "比較級+ than any other +単数名詞で「ほかのどの〜よりも」となる形だから",
            correct: true
          },
          {
            answer: "any others",
            reason: "ほかのすべての都市と比べているので、複数を表す others にするから",
            correct: false
          }
        ],
        explanation:
          "than any other +単数名詞は、比較級を使って最上級と同じ内容を表す言い方です。",
        misconception:
          "意味の上では複数の都市と比べていますが、any other のあとは1つずつ取り出して比べるので単数名詞です。others は代名詞なので、直後に city を置けません。"
      },
      {
        id: "comparison-6",
        level: 3,
        point: "not so much A as B",
        variant: "word",
        prompt: "She is not so much a singer ____ a dancer.",
        translation: "彼女は歌手というよりむしろダンサーだ。",
        options: [
          {
            answer: "as",
            reason: "not so much A as B で「A というよりむしろ B」を表す決まった形で、so much と対応するのが as だから",
            correct: true
          },
          {
            answer: "than",
            reason: "歌手とダンサーの2つを比べているので、比較を表す than を使うから",
            correct: false
          }
        ],
        explanation:
          "not so much A as B は B に重点があります。so 〜 as 〜 の対応を崩さないことがポイントです。",
        misconception:
          "比べているから than、と考えています。than とセットになるのは比較級（-er / more 〜）で、この文には比較級がありません。"
      }
    ]
  }
];

module.exports = { grammarUnits };

"use strict";

// 語彙の問題バンク（文法と同じ2択＋根拠の形式）。
// 単語の意味を覚えているかではなく、「なぜその語なのか」を選ばせる。
// 形式・フィールドは data/grammarBank.js と同じ。

const vocabUnits = [
  {
    id: "polysemy",
    order: 1,
    title: "多義語",
    subtitle: "同じ語が文脈で意味を変える",
    overview:
      "英語の基本動詞は意味の幅が広く、目的語や前置詞との組み合わせで意味が決まります。訳語を1つ覚えるのではなく、どの組み合わせでどの意味になるかを押さえます。",
    questions: [
      {
        id: "polysemy-1",
        level: 2,
        point: "tell（見分ける）",
        variant: "word",
        prompt: "I can't ____ the difference between these two words.",
        translation: "この2つの語の違いが分からない。",
        options: [
          {
            answer: "tell",
            reason: "tell には「見分ける」という意味があり、tell the difference の形で使うから",
            correct: true
          },
          {
            answer: "say",
            reason: "「言う」という意味で、述べる内容を目的語にとる動詞だから",
            correct: false
          }
        ],
        explanation:
          "tell A from B（A と B を見分ける）、tell the difference（違いが分かる）。判断する意味の tell です。",
        misconception:
          "say は発言の中身を言う動詞で、区別する意味はありません。日本語の「言う」から選ぶと外れる典型例です。"
      },
      {
        id: "polysemy-2",
        level: 2,
        point: "matter（重要である）",
        variant: "word",
        prompt: "It doesn't ____ what other people think.",
        translation: "他人がどう思うかは重要ではない。",
        options: [
          {
            answer: "matter",
            reason: "matter は動詞で「重要である」という意味を持ち、主語が事柄だから",
            correct: true
          },
          {
            answer: "mind",
            reason: "「気にする」という意味なので、気にしないことを表せるから",
            correct: false
          }
        ],
        explanation:
          "matter は名詞（問題・事柄）だけでなく動詞でも使い、It doesn't matter. で「どうでもいい」を表します。",
        misconception:
          "mind は人が主語で「気にする」。この文の主語は It（＝他人がどう思うか）という事柄なので、人の気持ちを表す mind は使えません。"
      },
      {
        id: "polysemy-3",
        level: 3,
        point: "cover（まかなう）",
        variant: "word",
        prompt: "The company will ____ the cost of your trip.",
        translation: "会社が出張費を負担します。",
        options: [
          {
            answer: "cover",
            reason: "cover には「（費用を）まかなう」という意味があるから",
            correct: true
          },
          {
            answer: "hide",
            reason: "「覆う」という中心の意味から、見えなくするという意味になるから",
            correct: false
          }
        ],
        explanation:
          "cover は「覆う」が中心の意味で、費用なら「まかなう」、話題なら「扱う」、報道なら「取材する」に広がります。",
        misconception:
          "hide は「隠す」で、費用を負担する意味はありません。同じ「覆う」でも、目的語が費用のときは支払う側の意味になります。"
      },
      {
        id: "polysemy-4",
        level: 3,
        point: "run（経営する）",
        variant: "reason",
        prompt: "She ____ a small restaurant near the station.",
        translation: "彼女は駅の近くで小さなレストランを経営している。",
        options: [
          {
            answer: "runs",
            reason: "run は目的語が事業や組織のとき「経営する」という意味になるから",
            correct: true
          },
          {
            answer: "runs",
            reason: "店まで毎日走って通っていることを表すから",
            correct: false
          }
        ],
        explanation:
          "run は「走る」から「動かし続ける」へ広がり、run a business / run a machine / run a program のように使われます。",
        misconception:
          "走る意味なら runs to a restaurant のように前置詞が必要です。a restaurant を直接目的語にとっている時点で、「経営する」の意味だと判断できます。"
      },
      {
        id: "polysemy-5",
        level: 2,
        point: "hold on（電話を切らずに待つ）",
        variant: "word",
        prompt: "Could you ____ on a moment? I'll check the schedule.",
        translation: "少しそのままお待ちいただけますか。予定を確認します。",
        options: [
          {
            answer: "hold",
            reason: "hold on で「切らずにそのまま待つ」という意味になるから",
            correct: true
          },
          {
            answer: "wait",
            reason: "「待つ」という意味なので、そのまま wait を使うから",
            correct: false
          }
        ],
        explanation:
          "hold は「保つ」が中心の意味で、hold on は状態を保ったまま待つこと。電話でよく使われます。",
        misconception:
          "wait なら Wait a moment. と on を付けません。前置詞 on と組み合わせて「そのまま」を表せるのは hold です。"
      },
      {
        id: "polysemy-6",
        level: 2,
        point: "sense（感覚）",
        variant: "word",
        prompt: "He has a good ____ of humor.",
        translation: "彼はユーモアのセンスがある。",
        options: [
          {
            answer: "sense",
            reason: "a sense of 〜 で、その人に備わった感覚を表す決まった言い方だから",
            correct: true
          },
          {
            answer: "feeling",
            reason: "「感じ」という意味なので、感覚を表せるから",
            correct: false
          }
        ],
        explanation:
          "a sense of humor / a sense of direction / a sense of responsibility のように、備わった感覚や判断力は sense です。",
        misconception:
          "feeling はそのときどきの気持ちや感触を指します。持ち続けている能力としての感覚には sense を使います。"
      }
    ]
  },
  {
    id: "collocation",
    order: 2,
    title: "コロケーション",
    subtitle: "make / do / take / have の相性",
    overview:
      "英語には「この名詞にはこの動詞」という決まった組み合わせがあります。意味から考えても選べないので、組み合わせごと覚えるのが近道です。",
    questions: [
      {
        id: "collocation-1",
        level: 1,
        point: "make a decision",
        variant: "word",
        prompt: "I have to ____ a decision by tomorrow.",
        translation: "明日までに決断しなければならない。",
        options: [
          {
            answer: "make",
            reason: "decision は make と組み合わせる名詞だから",
            correct: true
          },
          {
            answer: "do",
            reason: "「決定を行う」という行為なので、行うを表す do を使うから",
            correct: false
          }
        ],
        explanation:
          "make は新しく生み出すもの（make a decision / a mistake / progress / an effort）、do は作業（do the dishes / homework）と結びつきます。",
        misconception:
          "日本語の「する」はどちらにも訳せるため、意味から選ぶと外れます。名詞ごとに相手の動詞が決まっていると考えます。"
      },
      {
        id: "collocation-2",
        level: 2,
        point: "do someone a favor",
        variant: "word",
        prompt: "Could you ____ me a favor?",
        translation: "お願いを聞いてもらえますか。",
        options: [
          {
            answer: "do",
            reason: "favor は do と組み合わせ、do +人+ a favor で「頼みを聞く」となるから",
            correct: true
          },
          {
            answer: "make",
            reason: "頼みを作り出すことになるので、make を使うから",
            correct: false
          }
        ],
        explanation:
          "do me a favor は決まった形です。Would you do me a favor? / Do me a favor and close the door. のように使います。",
        misconception:
          "make a favor という言い方はありません。make は生み出すもの、do は相手のためにする行為、と分けて覚えます。"
      },
      {
        id: "collocation-3",
        level: 2,
        point: "take advantage of",
        variant: "word",
        prompt: "You should ____ advantage of this chance.",
        translation: "この機会を生かすべきだ。",
        options: [
          {
            answer: "take",
            reason: "take advantage of 〜 で「〜を利用する」という決まった形だから",
            correct: true
          },
          {
            answer: "get",
            reason: "「有利さを得る」という意味なので、得るを表す get を使うから",
            correct: false
          }
        ],
        explanation:
          "take advantage of / take part in / take care of のように、take は決まった形で1つの動詞のようにはたらきます。",
        misconception:
          "get an advantage（有利さを得る）という言い方はありますが、機会を生かす意味の慣用表現は take advantage of 〜 と決まっています。"
      },
      {
        id: "collocation-4",
        level: 2,
        point: "take effect",
        variant: "reason",
        prompt: "The new rule will ____ effect next month.",
        translation: "新しい規則は来月から効力を持つ。",
        options: [
          {
            answer: "take",
            reason: "take effect で「効力を持ち始める」という決まった形だから",
            correct: true
          },
          {
            answer: "take",
            reason: "規則が効果を受け取るという意味になるから",
            correct: false
          }
        ],
        explanation:
          "take place（行われる）、take effect（効力を持つ）、take shape（形になる）のように、take は「ある状態に入る」ことも表します。",
        misconception:
          "この take は「受け取る」ではありません。同じ take でも組み合わせる名詞で意味が決まるので、句ごと覚えます。"
      },
      {
        id: "collocation-5",
        level: 3,
        point: "have an influence on",
        variant: "word",
        prompt: "Her work ____ a strong influence on modern art.",
        translation: "彼女の作品は現代美術に強い影響を与えた。",
        options: [
          {
            answer: "had",
            reason: "have an influence on 〜 で「〜に影響を与える」という形になるから",
            correct: true
          },
          {
            answer: "gave",
            reason: "日本語の「影響を与える」に合わせて、与えるを表す give を使うから",
            correct: false
          }
        ],
        explanation:
          "英語では influence / effect / impact は have や exert と組み合わせます。have an effect on / have an impact on も同じ形です。",
        misconception:
          "give an influence とは言いません。日本語の動詞をそのまま英語に置き換えると外れる、典型的なコロケーションです。"
      },
      {
        id: "collocation-6",
        level: 2,
        point: "take a break",
        variant: "word",
        prompt: "Let's ____ a break for ten minutes.",
        translation: "10分休憩しよう。",
        options: [
          {
            answer: "take",
            reason: "break / walk / bath / look のような行為は take と組み合わせるから",
            correct: true
          },
          {
            answer: "do",
            reason: "休憩という行為をするので、行うを表す do を使うから",
            correct: false
          }
        ],
        explanation:
          "take a break / take a walk / take a look / take a rest。ひとまとまりの短い行為は take でまとめます。",
        misconception:
          "do は掃除や宿題のような「こなす作業」に使います。休憩は作業ではないので do とは組み合わせません。"
      }
    ]
  },
  {
    id: "confusables",
    order: 3,
    title: "紛らわしい語",
    subtitle: "形が似ていて意味が違う語",
    overview:
      "同じ語源から派生した形容詞は、語尾によって意味が分かれます。見た目が似ているぶん、意味の違いを押さえていないと選べません。",
    questions: [
      {
        id: "confusables-1",
        level: 2,
        point: "economic と economical",
        variant: "word",
        prompt: "Buying in bulk is more ____ than buying one at a time.",
        translation: "まとめ買いのほうが、1つずつ買うより経済的だ。",
        options: [
          {
            answer: "economical",
            reason: "「無駄がない・節約になる」という意味を表す語だから",
            correct: true
          },
          {
            answer: "economic",
            reason: "「経済の」という意味なので、お金に関することを表せるから",
            correct: false
          }
        ],
        explanation:
          "economic は経済という分野（economic growth / economic policy）、economical は費用や資源の節約（an economical car）です。",
        misconception:
          "どちらも「経済」に関わりますが、economic は分野を指す語で、節約の意味はありません。-al の有無で意味が変わる代表例です。"
      },
      {
        id: "confusables-2",
        level: 2,
        point: "considerate と considerable",
        variant: "word",
        prompt: "It was very ____ of you to remember my birthday.",
        translation: "誕生日を覚えていてくれるなんて、とても思いやりがありますね。",
        options: [
          {
            answer: "considerate",
            reason: "「思いやりのある」という意味で、人の性質を表す語だから",
            correct: true
          },
          {
            answer: "considerable",
            reason: "「相当な」という意味で、程度が大きいことを表す語だから",
            correct: false
          }
        ],
        explanation:
          "It is +形容詞+ of +人+ to do の形では、人の性質を表す形容詞が入ります（kind / careless / considerate）。",
        misconception:
          "considerable は a considerable amount of money のように量や程度を表します。人の性格を表すことはできません。"
      },
      {
        id: "confusables-3",
        level: 3,
        point: "industrious と industrial",
        variant: "word",
        prompt: "He is an ____ student who never gives up.",
        translation: "彼は決してあきらめない勤勉な学生だ。",
        options: [
          {
            answer: "industrious",
            reason: "「勤勉な」という意味で、人の働きぶりを表す語だから",
            correct: true
          },
          {
            answer: "industrial",
            reason: "「産業の」という意味なので、働くことに関わる語だから",
            correct: false
          }
        ],
        explanation:
          "industry には「産業」と「勤勉」の2つの意味があり、形容詞はそれぞれ industrial と industrious に分かれます。",
        misconception:
          "industrial は industrial waste / industrial area のように産業の話に使います。人の勤勉さには使いません。"
      },
      {
        id: "confusables-4",
        level: 2,
        point: "sensitive と sensible",
        variant: "reason",
        prompt: "Please be ____ when you tell her the news.",
        translation: "彼女にその知らせを伝えるときは、気持ちに配慮してください。",
        options: [
          {
            answer: "sensitive",
            reason: "「敏感な・細やかな」という意味で、相手の気持ちに気を配ることを表すから",
            correct: true
          },
          {
            answer: "sensitive",
            reason: "「分別のある」という意味で、賢明にふるまうことを表すから",
            correct: false
          }
        ],
        explanation:
          "sensitive は感じ取る力（be sensitive to criticism）、sensible は判断力（a sensible decision）です。",
        misconception:
          "「分別のある」は sensible で、別の語です。語の意味を取り違えたまま正しい語を選んでも、次に sensible が出たときに外れます。"
      },
      {
        id: "confusables-5",
        level: 3,
        point: "successive と successful",
        variant: "word",
        prompt: "The team won on three ____ days.",
        translation: "そのチームは3日連続で勝った。",
        options: [
          {
            answer: "successive",
            reason: "「連続する」という意味で、日が続くことを表す語だから",
            correct: true
          },
          {
            answer: "successful",
            reason: "「成功した」という意味なので、勝った日を表せるから",
            correct: false
          }
        ],
        explanation:
          "succeed には「成功する」と「あとに続く」の2つの意味があり、形容詞は successful と successive に分かれます。",
        misconception:
          "three successful days では「成功した3日間」となり、連続しているかどうかを表せません。ここは日が続いていることが要点です。"
      },
      {
        id: "confusables-6",
        level: 2,
        point: "effect と affect",
        variant: "word",
        prompt: "The medicine had no ____ on him.",
        translation: "その薬は彼に効かなかった。",
        options: [
          {
            answer: "effect",
            reason: "冠詞 no のあとに来る名詞の位置なので、名詞の effect が入るから",
            correct: true
          },
          {
            answer: "affect",
            reason: "「影響する」という意味を表す語だから",
            correct: false
          }
        ],
        explanation:
          "effect は名詞「影響・効果」、affect は動詞「〜に影響する」。have an effect on 〜 と affect 〜 は同じ内容を別の品詞で表します。",
        misconception:
          "意味だけで選ぶと動詞の affect を選んでしまいます。no のあとは名詞が来る位置だ、と品詞から判断します。"
      }
    ]
  },
  {
    id: "phrasal",
    order: 4,
    title: "句動詞",
    subtitle: "動詞＋前置詞・副詞で意味が決まる",
    overview:
      "句動詞は丸暗記しなくても、前置詞・副詞の持つ感覚（off は離す、into は入り込む、up は仕上がる）から意味を推測できます。",
    questions: [
      {
        id: "phrasal-1",
        level: 2,
        point: "call off（中止する）",
        variant: "word",
        prompt: "The game was ____ because of the heavy rain.",
        translation: "大雨のため試合は中止になった。",
        options: [
          {
            answer: "called off",
            reason: "off に「離す・止める」感覚があり、call off で「中止する」となるから",
            correct: true
          },
          {
            answer: "called on",
            reason: "on に「続ける」感覚があるので、試合の続行を決める意味になるから",
            correct: false
          }
        ],
        explanation:
          "call off は予定を取りやめること。同じ off を持つ put off（延期する）、take off（脱ぐ・離陸する）も「離れる」感覚です。",
        misconception:
          "call on は「（人を）訪ねる」「（人に）求める」という意味で、試合の続行を表しません。because of the heavy rain という理由とも合いません。"
      },
      {
        id: "phrasal-2",
        level: 2,
        point: "take after（似ている）",
        variant: "word",
        prompt: "He ____ his father in appearance.",
        translation: "彼は見た目が父親に似ている。",
        options: [
          {
            answer: "takes after",
            reason: "take after 〜 で「（血縁者に）似ている」という意味になるから",
            correct: true
          },
          {
            answer: "takes over",
            reason: "親から受け継いだものを表すので、引き継ぐ意味の take over を使うから",
            correct: false
          }
        ],
        explanation:
          "take after は外見や性格が血縁者に似ていること。resemble 1語でも言い換えられます。",
        misconception:
          "take over は仕事・役割・会社を引き継ぐことです。受け継ぐという発想から選びたくなりますが、外見の類似には使いません。"
      },
      {
        id: "phrasal-3",
        level: 3,
        point: "look into（調査する）",
        variant: "word",
        prompt: "The police are ____ the cause of the accident.",
        translation: "警察が事故の原因を調べている。",
        options: [
          {
            answer: "looking into",
            reason: "into に「中に入り込む」感覚があり、look into で「調査する」となるから",
            correct: true
          },
          {
            answer: "looking after",
            reason: "after に「後を追う」感覚があるので、原因を追跡する意味になるから",
            correct: false
          }
        ],
        explanation:
          "look into は中身に踏み込んで調べること。investigate 1語でも言い換えられます。",
        misconception:
          "look after は「世話をする」という意味で、追跡や調査の意味はありません。after の「後を追う」感覚から意味を作ってしまう例です。"
      },
      {
        id: "phrasal-4",
        level: 2,
        point: "run out of（切らす）",
        variant: "reason",
        prompt: "We've ____ out of milk. Could you buy some?",
        translation: "牛乳を切らしてしまった。買ってきてくれる？",
        options: [
          {
            answer: "run",
            reason: "run out of 〜 で「〜を使い果たす」という決まった形だから",
            correct: true
          },
          {
            answer: "run",
            reason: "牛乳を求めて走り回ったことを表すから",
            correct: false
          }
        ],
        explanation:
          "run out of は在庫や時間が尽きること。We're running out of time.（時間がなくなってきた）もよく使われます。",
        misconception:
          "走る意味はありません。run は「（ある状態へ）進む」という感覚も持ち、out of と組むと「尽きる方向へ進む」になります。"
      },
      {
        id: "phrasal-5",
        level: 3,
        point: "bring up（育てる）",
        variant: "word",
        prompt: "She was ____ by her grandmother in Okinawa.",
        translation: "彼女は沖縄で祖母に育てられた。",
        options: [
          {
            answer: "brought up",
            reason: "up に「大きくする・仕上げる」感覚があり、bring up で「育てる」となるから",
            correct: true
          },
          {
            answer: "brought about",
            reason: "about に「まわりに」の感覚があるので、周囲が関わって育てる意味になるから",
            correct: false
          }
        ],
        explanation:
          "bring up は子どもを育てること、また話題を持ち出すこと。raise でも言い換えられます。",
        misconception:
          "bring about は変化や結果を引き起こすこと（bring about a change）で、人を育てる意味はありません。"
      },
      {
        id: "phrasal-6",
        level: 2,
        point: "put off（延期する）",
        variant: "word",
        prompt: "Don't ____ until tomorrow what you can do today.",
        translation: "今日できることを明日まで延ばすな。",
        options: [
          {
            answer: "put off",
            reason: "off に「離す」感覚があり、put off で「先に延ばす」となるから",
            correct: true
          },
          {
            answer: "put on",
            reason: "on に「接触」の感覚があるので、予定に載せる意味になるから",
            correct: false
          }
        ],
        explanation:
          "put off は予定を先へ押しやること。postpone 1語でも言い換えられます。",
        misconception:
          "put on は服を身につける、電源を入れるなど「接触させる」意味です。until tomorrow という語句とも噛み合いません。"
      }
    ]
  }
];

module.exports = { vocabUnits };

"use strict";

// 読解用パッセージ。1本 200〜300 語程度、高校標準レベル。
// paragraphs / translations は同じ長さで対応させる（段落ごとに和訳を出すため）。

const readingPassages = [
  {
    id: "yawn",
    order: 1,
    level: 1,
    title: "Why Do We Yawn?",
    titleJa: "なぜ私たちはあくびをするのか",
    topic: "科学・身体",
    paragraphs: [
      "Everyone yawns. Babies yawn before they are born, and dogs, cats, and even fish open their mouths in a similar way. Yet for a long time, scientists could not agree on why we do it. The old explanation, which many people still believe, is that yawning brings extra oxygen into a tired body.",
      "That idea turned out to be hard to support. In one experiment, volunteers breathed air with more oxygen than usual, and then air with more carbon dioxide. Neither change made them yawn more or less. If yawning were simply a way of taking in oxygen, the researchers argued, the results should have been very different.",
      "A newer theory is that a yawn cools the brain. When we are tired or bored, the temperature of the brain rises slightly. A deep yawn pulls cool air into the mouth and increases blood flow in the head, which may push that temperature back down. Supporting this idea, people yawn less often in very hot weather, when the outside air is too warm to be of any help.",
      "Yawning is also social. Seeing, hearing, or even reading about a yawn can make you yawn, and the effect is strongest among close friends and family members. Some researchers think this contagious yawning helped early human groups stay alert at the same time. If so, the small act you try to hide in class has a surprisingly long history."
    ],
    translations: [
      "誰でもあくびをする。赤ちゃんは生まれる前からあくびをするし、犬も猫も、魚でさえ似たような形で口を開ける。それなのに長いあいだ、科学者たちはなぜあくびをするのかについて意見が一致しなかった。今でも多くの人が信じている古い説明は、あくびは疲れた体に余分な酸素を取り込むものだ、というものである。",
      "その考えは、裏づけるのが難しいと分かった。ある実験では、被験者はまず普段より酸素の多い空気を吸い、次に二酸化炭素の多い空気を吸った。どちらの変化でも、あくびの回数は増えも減りもしなかった。もしあくびが単に酸素を取り込む手段なのだとしたら、結果はまったく違っていたはずだ、と研究者たちは主張した。",
      "より新しい理論は、あくびが脳を冷やすというものだ。疲れていたり退屈していたりすると、脳の温度がわずかに上がる。深いあくびは冷たい空気を口の中に引き込み、頭部の血流を増やす。それが温度を押し下げているのかもしれない。この考えを裏づけるように、とても暑い天気のときには人はあくびをする回数が減る。外の空気が暖かすぎて役に立たないからである。",
      "あくびには社会的な面もある。あくびを見たり、聞いたり、あくびについて読んだりするだけでもあくびが出ることがあり、その効果は親しい友人や家族のあいだで最も強い。この伝染するあくびは、初期の人類の集団が同じタイミングで覚醒状態を保つのに役立ったのだと考える研究者もいる。もしそうなら、授業中に隠そうとするあの小さな動作には、驚くほど長い歴史があることになる。"
    ],
    glossary: [
      { word: "yawn", meaning: "あくびをする／あくび" },
      { word: "oxygen", meaning: "酸素" },
      { word: "carbon dioxide", meaning: "二酸化炭素" },
      { word: "volunteer", meaning: "（実験の）被験者、志願者" },
      { word: "slightly", meaning: "わずかに" },
      { word: "contagious", meaning: "伝染する、うつりやすい" },
      { word: "alert", meaning: "油断のない、目がさえた" }
    ],
    keySentences: [
      {
        text: "If yawning were simply a way of taking in oxygen, the researchers argued, the results should have been very different.",
        structure:
          "仮定法過去（If ... were）＋主節の should have been。the researchers argued は挿入句なので、いったん外して読むと骨組みが見えます。",
        translation: "「もしあくびが単に酸素を取り込む手段なのだとしたら、結果はまったく違っていたはずだ」と研究者たちは主張した。"
      },
      {
        text: "Seeing, hearing, or even reading about a yawn can make you yawn, and the effect is strongest among close friends and family members.",
        structure:
          "3つの動名詞 Seeing / hearing / reading が並んで主語になっています。述語は can make で、make +目的語+原形（you yawn）の形です。and 以下は別の文が続く形で、the effect は「あくびがうつる効果」を指します。",
        translation: "あくびを見たり、聞いたり、あくびについて読んだりするだけでもあくびが出ることがあり、その効果は親しい友人や家族のあいだで最も強い。"
      }
    ],
    questions: [
      {
        id: "yawn-q1",
        typeJa: "内容一致",
        variant: "word",
        prompt: "What did the experiment in the second paragraph show?",
        options: [
          {
            answer: "Changing the amount of oxygen or carbon dioxide did not change how often people yawned.",
            reason: "第2段落の Neither change made them yawn more or less. の neither が「どちらの変化でも〜ない」と両方を否定しているから",
            correct: true
          },
          {
            answer: "People yawned more when they breathed air with more oxygen.",
            reason: "第1段落に「あくびは酸素を取り込むもの」とあり、酸素が増えればあくびも増えるはずだから",
            correct: false
          }
        ],
        evidence: "Neither change made them yawn more or less.",
        explanation:
          "neither は2つのものをまとめて否定する語です。酸素を増やしても二酸化炭素を増やしても、あくびの回数は変わらなかったと述べています。",
        misconception:
          "第1段落の「古い説明」を本文の主張として読んでいます。The old explanation ... is that 〜 は、このあと否定される考えとして紹介されているものです。"
      },
      {
        id: "yawn-q2",
        typeJa: "因果関係",
        variant: "reason",
        prompt: "According to the cooling theory, why do people yawn less in very hot weather?",
        options: [
          {
            answer: "The outside air is too warm to lower the temperature of the brain.",
            reason: "第3段落末の too warm to be of any help が「暖かすぎて役に立たない」と理由を述べているから",
            correct: true
          },
          {
            answer: "The outside air is too warm to lower the temperature of the brain.",
            reason: "暑い日は体温が上がって脳を冷やす必要がなくなるので、あくびをする理由もなくなるから",
            correct: false
          }
        ],
        evidence: "when the outside air is too warm to be of any help",
        explanation:
          "あくびの目的が脳を冷やすことなら、外の空気が暖かいときにあくびをしても意味がない、という筋道です。too 〜 to … は「…するには〜すぎる」。",
        misconception:
          "結論は同じでも、根拠が本文にありません。本文が挙げている理由は「外の空気が暖かすぎて冷却の役に立たない」であって、冷やす必要がなくなるからではありません。もっともらしい理屈を自分で補ってしまう誤りです。"
      },
      {
        id: "yawn-q3",
        typeJa: "語彙推測",
        variant: "word",
        prompt: "In the last paragraph, what does contagious mean?",
        options: [
          {
            answer: "Spreading easily from one person to another",
            reason: "直前に「見たり聞いたりするだけでこちらもあくびが出る」とあり、その内容を1語で言い換えているから",
            correct: true
          },
          {
            answer: "Difficult to stop once it begins",
            reason: "あくびは一度始まると止まらないものだという一般的な感覚に合うから",
            correct: false
          }
        ],
        evidence: "Seeing, hearing, or even reading about a yawn can make you yawn",
        explanation:
          "未知語の意味は、前後にある言い換えから決めます。ここでは直前の一文がそのまま contagious の説明になっています。",
        misconception:
          "自分の知識や印象で語義を埋めています。本文に書かれていない「止まらない」という要素を持ち込むと、書き手の主張からずれていきます。"
      },
      {
        id: "yawn-q4",
        typeJa: "要旨",
        variant: "word",
        prompt: "Which sentence best describes the whole passage?",
        options: [
          {
            answer: "The old oxygen explanation has been replaced by newer ideas about cooling and social behavior.",
            reason: "第1段落で古い説を示し、第2段落で否定し、第3・4段落で新しい説を2つ挙げるという構成そのものが要旨だから",
            correct: true
          },
          {
            answer: "Scientists have finally proved exactly why people yawn.",
            reason: "第3段落と第4段落で理論が示され、研究者の考えも紹介されているから",
            correct: false
          }
        ],
        evidence: "The old explanation ... A newer theory is that a yawn cools the brain. ... Yawning is also social.",
        explanation:
          "要旨は段落の並び方に表れます。旧説→反証→新説という流れをそのまま一文にまとめたものが答えになります。",
        misconception:
          "may / Some researchers think / If so は、断定を避けるための語です。これらがある文章を「証明された」とまとめると言い過ぎになります。"
      }
    ]
  },
  {
    id: "citybees",
    order: 2,
    level: 2,
    title: "Bees on the Roof",
    titleJa: "屋上のミツバチ",
    topic: "環境・都市",
    paragraphs: [
      "Ten years ago, if you had told people in London that bees could live well in the middle of a city, most of them would have laughed. Cities seemed like the worst possible place for insects: crowded, noisy, and covered in concrete. Today, however, hives sit on the roofs of hotels, schools, and even opera houses, and the bees in them are often healthier than those in the countryside.",
      "The reason has less to do with cities than with modern farming. In many farming areas, a single crop covers field after field. When that crop flowers, bees have more food than they can use; when it stops, they have almost nothing. Cities, by contrast, are full of small gardens, parks, and balconies, each planted with something different, so something is in bloom from March to October.",
      "Urban beekeeping has limits. If too many hives are placed in one district, the bees begin to compete with wild pollinators such as bumblebees, which cannot fly as far to find food. Experts now advise cities to plant more flowers before adding more hives.",
      "Still, the rooftop hive does something no advertisement can. People who have watched bees work above a busy street rarely think of nature as something that exists only far away."
    ],
    translations: [
      "10年前、ロンドンの人々に「ミツバチは街の真ん中でも元気に暮らせる」と言ったら、ほとんどの人は笑っただろう。都市は昆虫にとって考えうる限り最悪の場所に見えた。混雑していて、騒がしく、コンクリートに覆われているからだ。ところが今日では、ホテルや学校、さらにはオペラハウスの屋上に巣箱が置かれ、そこにいるミツバチは田舎のミツバチより健康であることも多い。",
      "その理由は、都市そのものよりも現代の農業に関係がある。多くの農業地域では、ひとつの作物が畑から畑へと一面に広がっている。その作物が花を咲かせるとき、ミツバチには使い切れないほどの餌がある。しかし花が終われば、ほとんど何も残らない。それに対して都市には、小さな庭や公園、ベランダがあふれていて、それぞれに違うものが植えられている。だから3月から10月まで、何かしらが咲いている。",
      "都市養蜂には限界もある。ひとつの地区にあまりに多くの巣箱が置かれると、ミツバチはマルハナバチのような野生の花粉媒介者と餌を奪い合うようになる。マルハナバチはミツバチほど遠くまで餌を探しに飛べないからだ。専門家は今、巣箱を増やす前にもっと花を植えるよう都市に勧めている。",
      "それでも、屋上の巣箱にはどんな広告にもできないことができる。にぎやかな通りの上でミツバチが働くのを見たことがある人は、自然を「遠くにだけあるもの」とはめったに考えなくなるのだ。"
    ],
    glossary: [
      { word: "hive", meaning: "（ミツバチの）巣箱" },
      { word: "crop", meaning: "作物" },
      { word: "in bloom", meaning: "花が咲いて" },
      { word: "by contrast", meaning: "それに対して" },
      { word: "pollinator", meaning: "花粉を運ぶ生き物、花粉媒介者" },
      { word: "bumblebee", meaning: "マルハナバチ" },
      { word: "district", meaning: "地区" }
    ],
    keySentences: [
      {
        text: "Ten years ago, if you had told people in London that bees could live well in the middle of a city, most of them would have laughed.",
        structure:
          "仮定法過去完了（if +主語+ had +過去分詞 …, 主語+ would have +過去分詞）。過去の事実に反する仮定を表し、「実際にはそんな話はしなかった」という含みがあります。",
        translation: "10年前、ロンドンの人々に「ミツバチは街の真ん中でも元気に暮らせる」と言っていたら、ほとんどの人は笑っただろう。"
      },
      {
        text: "The reason has less to do with cities than with modern farming.",
        structure:
          "have to do with 〜（〜と関係がある）に less 〜 than … が組み合わさった形。「都市と関係があるというより、むしろ現代農業と関係がある」と、後半に重点があります。",
        translation: "その理由は、都市よりもむしろ現代の農業に関係がある。"
      }
    ],
    questions: [
      {
        id: "citybees-q1",
        typeJa: "要旨",
        variant: "word",
        prompt: "What is the main point of the passage?",
        options: [
          {
            answer: "City bees often do well because cities offer a variety of flowers over a long season.",
            reason: "第2段落が by contrast で「単一作物の農地」と「多様な都市」を対比し、健康である理由を説明しているから",
            correct: true
          },
          {
            answer: "Bees should be moved from the countryside to cities as soon as possible.",
            reason: "第1段落に都市のミツバチのほうが健康だとあるので、都市へ移すべきだと分かるから",
            correct: false
          }
        ],
        evidence: "Cities, by contrast, are full of small gardens, parks, and balconies ... so something is in bloom from March to October.",
        explanation:
          "by contrast は対比の合図です。この語を見つけると、筆者がどの2つを比べているかがはっきりします。",
        misconception:
          "事実の記述から筆者の提案へ飛躍しています。第3段落では逆に「巣箱を増やす前に花を植えよ」と慎重な立場が示されています。"
      },
      {
        id: "citybees-q2",
        typeJa: "内容一致",
        variant: "word",
        prompt: "What problem do bees face where a single crop is grown?",
        options: [
          {
            answer: "They have far too much food for a short time and almost none afterward.",
            reason: "第2段落のセミコロンをはさんだ2文が、more food than they can use と almost nothing を対比しているから",
            correct: true
          },
          {
            answer: "They cannot find any food at all during the whole year.",
            reason: "同じ段落に almost nothing とあり、餌がないと書かれているから",
            correct: false
          }
        ],
        evidence: "When that crop flowers, bees have more food than they can use; when it stops, they have almost nothing.",
        explanation:
          "セミコロンは対になる2文を並べる記号です。前半（花が咲いているとき）と後半（終わったとき）をセットで読みます。",
        misconception:
          "almost nothing だけを抜き出しています。それは花が終わったあとの話で、前半の when that crop flowers を読み落とすと一年中餌がないことになってしまいます。"
      },
      {
        id: "citybees-q3",
        typeJa: "内容一致",
        variant: "reason",
        prompt: "What do experts advise cities to do?",
        options: [
          {
            answer: "Plant more flowers before increasing the number of hives.",
            reason: "第3段落の advise cities to plant more flowers before adding more hives が、助言の中身と順序をそのまま示しているから",
            correct: true
          },
          {
            answer: "Plant more flowers before increasing the number of hives.",
            reason: "都市には花が少なく、ミツバチの餌が足りていないと書かれているから",
            correct: false
          }
        ],
        evidence: "Experts now advise cities to plant more flowers before adding more hives.",
        explanation:
          "advise +目的語+ to 不定詞で助言の内容が示されます。before 以下の順序まで含めて読み取ります。",
        misconception:
          "答えは合っていますが、根拠が本文と逆です。第2段落は都市が多様な花にあふれていると述べています。本文の理由は「巣箱が増えすぎると野生のハチと餌を奪い合うから」です。"
      },
      {
        id: "citybees-q4",
        typeJa: "推論",
        variant: "word",
        prompt: "What does the writer suggest in the last paragraph?",
        options: [
          {
            answer: "Seeing bees at work changes how city people think about nature.",
            reason: "最終文の rarely think of nature as something that exists only far away が「遠くにあるものとは考えなくなる」という否定だから",
            correct: true
          },
          {
            answer: "Nature can only be understood far from the city.",
            reason: "最終文に nature ... exists only far away と書かれているから",
            correct: false
          }
        ],
        evidence: "People who have watched bees work above a busy street rarely think of nature as something that exists only far away.",
        explanation:
          "rarely は「めったに〜ない」という否定語です。否定語を拾えるかどうかで、文の向きが正反対になります。",
        misconception:
          "文の一部だけを抜き出して読んでいます。exists only far away は rarely think of nature as 〜 の中身で、筆者が否定している考え方のほうです。"
      }
    ]
  },
  {
    id: "sleep",
    order: 3,
    level: 2,
    title: "Sleep and What You Studied",
    titleJa: "睡眠と、勉強したこと",
    topic: "教育・脳科学",
    paragraphs: [
      "Students often treat sleep as the enemy of study. The night before a test, they cut their sleep short in order to read one more chapter. Research on memory suggests that this is a bad trade.",
      "Memories are not stored the moment we learn something. During the hours after learning, the brain slowly moves new information from short-term storage into a more permanent form, a process called consolidation. Much of this work happens while we sleep. In a well-known study, two groups learned the same list of words. The group that slept for eight hours afterward remembered far more the next morning than the group that stayed awake, even though both groups had spent the same amount of time studying.",
      "Different stages of sleep seem to handle different kinds of memory. Deep sleep, which comes mostly in the first half of the night, is linked to facts and events. REM sleep, which increases toward morning, is linked to skills and to the ability to see connections between ideas. Cutting a night short at either end therefore removes something useful.",
      "None of this means that sleeping instead of studying will produce good grades. Sleep protects what has already been learned; it cannot create knowledge that was never there. The practical advice is simple but unpopular: study earlier, and then go to bed."
    ],
    translations: [
      "学生は睡眠を勉強の敵のように扱いがちだ。試験の前の晩、もう一章読むために睡眠時間を削る。しかし記憶に関する研究は、この取引が割に合わないことを示している。",
      "記憶は、何かを学んだ瞬間に保存されるわけではない。学習後の数時間のあいだに、脳は新しい情報を短期的な保管場所からより永続的な形へとゆっくり移していく。この過程は「固定化（consolidation）」と呼ばれる。その作業の多くは、私たちが眠っているあいだに行われる。よく知られた研究では、2つのグループが同じ単語リストを覚えた。学習後に8時間眠ったグループは、起きていたグループより翌朝ずっと多くを覚えていた。両グループが勉強に使った時間は同じだったにもかかわらず、である。",
      "睡眠の段階によって、扱う記憶の種類も違うようだ。夜の前半に多く現れる深い睡眠は、事実や出来事の記憶と結びついている。朝に向かって増える REM 睡眠は、技能の記憶や、考えどうしのつながりを見つける力と結びついている。したがって、夜のどちら側を削っても、役に立つものが失われることになる。",
      "とはいえ、勉強の代わりに眠れば良い成績が取れる、という意味ではまったくない。睡眠はすでに学んだことを守るのであって、もともとなかった知識を作り出すことはできない。実践的な助言は単純だが人気がない。早めに勉強して、そして寝ること、である。"
    ],
    glossary: [
      { word: "trade", meaning: "取引、引き換え" },
      { word: "storage", meaning: "保管、記憶の保存場所" },
      { word: "permanent", meaning: "永続的な" },
      { word: "consolidation", meaning: "（記憶の）固定化" },
      { word: "stage", meaning: "段階" },
      { word: "practical", meaning: "実践的な" }
    ],
    keySentences: [
      {
        text: "The group that slept for eight hours afterward remembered far more the next morning than the group that stayed awake, even though both groups had spent the same amount of time studying.",
        structure:
          "主語 The group に関係代名詞節 that slept for eight hours afterward がかかり、述語は remembered。長い主語に惑わされず、The group ... remembered ... という骨組みをつかみます。far more は比較級の強調、even though 以下は譲歩節です。",
        translation: "その後8時間眠ったグループは、両グループの勉強時間が同じだったにもかかわらず、起きていたグループより翌朝ずっと多くを覚えていた。"
      },
      {
        text: "Sleep protects what has already been learned; it cannot create knowledge that was never there.",
        structure:
          "what は先行詞を含む関係代名詞で「すでに学ばれたこと」。セミコロンの前後が「守る／作り出せない」という対比になっています。",
        translation: "睡眠はすでに学んだことを守る。もともとなかった知識を作り出すことはできない。"
      }
    ],
    questions: [
      {
        id: "sleep-q1",
        typeJa: "語句の意味",
        variant: "word",
        prompt: "What is consolidation, as the passage uses the word?",
        options: [
          {
            answer: "The process of moving new information into a more lasting form",
            reason: "a process called consolidation が、直前の説明を同格で言い換えたものだから",
            correct: true
          },
          {
            answer: "A stage of sleep that comes just before morning",
            reason: "第3段落で睡眠の段階が説明されており、consolidation もその一つだと考えられるから",
            correct: false
          }
        ],
        evidence: "the brain slowly moves new information from short-term storage into a more permanent form, a process called consolidation",
        explanation:
          "専門用語は、初めて出てくる場所で定義されます。called / known as / that is の前後を見れば意味が分かります。",
        misconception:
          "語が出てきた場所ではなく、あとの段落の内容と結びつけています。定義はその語が最初に登場する第2段落にあります。"
      },
      {
        id: "sleep-q2",
        typeJa: "内容一致",
        variant: "word",
        prompt: "What did the study of the two groups show?",
        options: [
          {
            answer: "The group that slept remembered more, although both groups studied for the same length of time.",
            reason: "even though both groups had spent the same amount of time studying が譲歩節で、条件をそろえたことを示しているから",
            correct: true
          },
          {
            answer: "The group that slept studied for a longer time than the other group.",
            reason: "眠ったグループのほうがよく覚えていたので、勉強量も多かったと考えられるから",
            correct: false
          }
        ],
        evidence: "even though both groups had spent the same amount of time studying",
        explanation:
          "even though は「〜にもかかわらず」。勉強時間が同じという条件があるからこそ、差を生んだのは睡眠だと言えます。",
        misconception:
          "結果から原因を想像で補っています。譲歩節は、ほかの原因を消すために置かれている大事な情報です。"
      },
      {
        id: "sleep-q3",
        typeJa: "内容一致",
        variant: "reason",
        prompt: "According to the passage, REM sleep is linked to",
        options: [
          {
            answer: "skills and seeing connections between ideas.",
            reason: "第3段落の REM sleep, which increases toward morning, is linked to skills and to the ability to see connections between ideas がそのまま対応するから",
            correct: true
          },
          {
            answer: "skills and seeing connections between ideas.",
            reason: "REM 睡眠は朝に向かって増えると書かれており、朝は頭が冴えて発想が生まれやすいから",
            correct: false
          }
        ],
        evidence: "REM sleep, which increases toward morning, is linked to skills and to the ability to see connections between ideas.",
        explanation:
          "同じ段落に同じ形の文が2つ並ぶときは、主語を取り違えないように分けて読みます。深い睡眠は事実や出来事、REM 睡眠は技能と発想です。",
        misconception:
          "which increases toward morning は時間帯の説明にすぎず、「朝は頭が冴える」とは書かれていません。何と何が結びつくかは is linked to の直後で確かめます。"
      },
      {
        id: "sleep-q4",
        typeJa: "筆者の主張",
        variant: "word",
        prompt: "Which statement would the writer most likely agree with?",
        options: [
          {
            answer: "Studying early and then sleeping is better than studying late into the night.",
            reason: "最終段落の study earlier, and then go to bed が筆者の助言そのものだから",
            correct: true
          },
          {
            answer: "Sleeping longer is always more useful than studying.",
            reason: "睡眠が記憶を助けると本文全体で述べられているから",
            correct: false
          }
        ],
        evidence: "The practical advice is simple but unpopular: study earlier, and then go to bed.",
        explanation:
          "筆者の主張は、留保（〜という意味ではない）とセットで読みます。ここでは「睡眠は守るだけで、知識を作りはしない」と断ったうえで助言しています。",
        misconception:
          "always のような言い切りは、本文の留保と衝突します。筆者は None of this means that sleeping instead of studying 〜 とあらかじめ否定しています。"
      }
    ]
  },
  {
    id: "colorwords",
    order: 4,
    level: 3,
    title: "The Words We Have for Colors",
    titleJa: "色のことば",
    topic: "言語・文化",
    paragraphs: [
      "Look at a rainbow and you may feel that you are simply reporting what is there. In fact, the number of colors you name depends in part on the language you speak. English traditionally divides the band of light into seven colors; other languages draw the lines in other places, and some get by with far fewer basic terms.",
      "The clearest evidence comes from experiments that measure speed rather than eyesight. Russian has no single word for blue: lighter shades are called goluboy and darker ones siniy. When Russian speakers are asked which of two blue squares matches a third, they are slightly faster if the squares fall on opposite sides of that boundary. English speakers, who call all of them blue, show no such advantage.",
      "The difference is measured in milliseconds, and it disappears when speakers are asked to repeat numbers in their heads while looking at the squares. That detail matters. It suggests that language is not changing the eye; it is offering a shortcut that the mind uses when it is free to do so.",
      "Japanese offers a familiar example of how such boundaries shift. Ao once covered a range that included much of what is now called midori, which is why a traffic light that looks green is still called ao. Words for color are not labels stuck onto fixed categories. They are agreements, and agreements can change."
    ],
    translations: [
      "虹を見るとき、私たちはそこにあるものをそのまま報告しているだけだと感じるかもしれない。しかし実際には、いくつの色を名づけるかは、話す言語にある程度左右される。英語は伝統的に光の帯を7色に分けるが、別の言語は別の場所に線を引き、もっと少ない基本語で済ませる言語もある。",
      "最も明確な証拠は、視力ではなく速さを測る実験から得られている。ロシア語には「青」にあたる単一の語がなく、明るい色合いは goluboy、暗い色合いは siniy と呼ばれる。2つの青い四角のうちどちらが3つ目と同じかをロシア語話者に尋ねると、2つがその境界の反対側にある場合にわずかに速く答える。すべてを blue と呼ぶ英語話者には、そうした有利さは見られない。",
      "この差はミリ秒単位で測られるもので、四角を見ながら頭の中で数字を繰り返すよう指示されると消えてしまう。この点が重要だ。言語は目そのものを変えているのではなく、心に余裕があるときに使える近道を提供しているにすぎない、と考えられるからである。",
      "日本語には、こうした境界が動く身近な例がある。かつて「青」は、今「緑」と呼ばれるものの多くを含む範囲を覆っていた。だから緑色に見える信号が今でも「青」と呼ばれるのである。色のことばは、固定した範疇に貼りつけられたラベルではない。それは取り決めであり、取り決めは変わりうるのだ。"
    ],
    glossary: [
      { word: "in part", meaning: "部分的には、ある程度は" },
      { word: "get by with", meaning: "〜で間に合わせる" },
      { word: "shade", meaning: "色合い" },
      { word: "boundary", meaning: "境界" },
      { word: "millisecond", meaning: "ミリ秒（1000分の1秒）" },
      { word: "category", meaning: "範疇、区分" }
    ],
    keySentences: [
      {
        text: "It suggests that language is not changing the eye; it is offering a shortcut that the mind uses when it is free to do so.",
        structure:
          "セミコロンで「〜ではない／〜である」を対比。a shortcut を that the mind uses が後ろから修飾し、さらに when 節が条件を添えています。do so は use the shortcut の代用です。",
        translation: "それが示すのは、言語が目そのものを変えているのではなく、心に余裕のあるときに使える近道を提供しているということである。"
      },
      {
        text: "Ao once covered a range that included much of what is now called midori, which is why a traffic light that looks green is still called ao.",
        structure:
          "関係詞が3つ重なった文。a range that included …（範囲を修飾）、what is now called midori（〜と呼ばれるもの）、非制限用法の which（前の内容全体を受けて「だから〜なのだ」）。",
        translation: "「青」はかつて、今「緑」と呼ばれるものの多くを含む範囲を覆っていた。だから、緑に見える信号が今でも「青」と呼ばれるのである。"
      }
    ],
    questions: [
      {
        id: "colorwords-q1",
        typeJa: "内容一致",
        variant: "word",
        prompt: "What do the Russian experiments actually measure?",
        options: [
          {
            answer: "How quickly speakers match colors, not how well their eyes work",
            reason: "第2段落冒頭の experiments that measure speed rather than eyesight が、測っている対象を明示しているから",
            correct: true
          },
          {
            answer: "How many colors Russian speakers can see",
            reason: "第1段落に the number of colors ... depends on the language you speak とあり、見える色の数の話だから",
            correct: false
          }
        ],
        evidence: "experiments that measure speed rather than eyesight",
        explanation:
          "rather than は「〜ではなく」と対象を絞り込む語です。測っているのは速さであって、視力ではありません。",
        misconception:
          "name（名づける）と see（見える）を同じものとして読んでいます。第1段落も「いくつの色に名前を付けるか」の話で、見える色の数ではありません。"
      },
      {
        id: "colorwords-q2",
        typeJa: "指示語",
        variant: "reason",
        prompt: "What happens when speakers repeat numbers in their heads during the task?",
        options: [
          {
            answer: "The Russian speakers' small advantage disappears.",
            reason: "第3段落の it disappears の it が、直前の the difference（速さの差）を指しているから",
            correct: true
          },
          {
            answer: "The Russian speakers' small advantage disappears.",
            reason: "頭の中で数字を繰り返すと色に集中できなくなり、誰でも反応が遅くなるから",
            correct: false
          }
        ],
        evidence: "The difference is measured in milliseconds, and it disappears when speakers are asked to repeat numbers in their heads",
        explanation:
          "it / this / that が出てきたら、受けている中身を必ず前の文から特定します。ここでは the difference です。",
        misconception:
          "「誰でも遅くなる」とは本文に書かれていません。消えるのは it が指す the difference、つまり2つの言語の話者のあいだにあった差であって、速さそのものの話ではありません。"
      },
      {
        id: "colorwords-q3",
        typeJa: "具体例の役割",
        variant: "word",
        prompt: "Why does the writer mention the Japanese word ao?",
        options: [
          {
            answer: "To show that the boundaries between color words can shift over time",
            reason: "第4段落冒頭の a familiar example of how such boundaries shift が、この例の役割を先に述べているから",
            correct: true
          },
          {
            answer: "To prove that Japanese speakers cannot tell green from blue",
            reason: "緑色に見える信号を ao と呼ぶと書かれているから",
            correct: false
          }
        ],
        evidence: "Japanese offers a familiar example of how such boundaries shift.",
        explanation:
          "具体例の直前には、その例が何を示すためのものかを述べる文が置かれます。そこを読めば例の役割が決まります。",
        misconception:
          "例そのものから結論を作っています。本文が扱っているのは呼び名の範囲であって、色が見分けられるかどうかではありません。"
      },
      {
        id: "colorwords-q4",
        typeJa: "要旨",
        variant: "word",
        prompt: "Which statement best sums up the passage?",
        options: [
          {
            answer: "Language influences how quickly we sort colors, though it does not change what the eye sees.",
            reason: "第3段落の language is not changing the eye; it is offering a shortcut が、主張の範囲を限定しているから",
            correct: true
          },
          {
            answer: "People who speak different languages see completely different rainbows.",
            reason: "第1段落に、見える色の数は話す言語によって決まると書かれているから",
            correct: false
          }
        ],
        evidence: "language is not changing the eye; it is offering a shortcut",
        explanation:
          "筆者は「影響はあるが、目の働きを変えるほどではない」という限定つきの主張をしています。セミコロンの前後がその限定を作っています。",
        misconception:
          "in part（ある程度は）という限定を落として読んでいます。completely のような強い語は、限定つきの主張とは噛み合いません。"
      }
    ]
  },
  {
    id: "repaircafe",
    order: 5,
    level: 3,
    title: "The Repair Café",
    titleJa: "修理カフェ",
    topic: "社会・環境",
    paragraphs: [
      "On the second Saturday of every month, a community hall in Amsterdam fills with broken things: toasters, lamps, bicycles, a chair with a missing leg. Their owners sit beside volunteers who know how to fix them. Nobody pays, and nobody is simply served. The rule of a repair café is that the owner stays at the table and holds the screwdriver whenever possible.",
      "The movement began in 2009 with a single event and has since spread to more than two thousand locations worldwide. Part of the appeal is obvious. Household appliances are thrown away at a rate that would have shocked shoppers fifty years ago, and much of what is thrown away is close to working.",
      "The obstacles are just as clear. Some products are built in ways that make repair difficult: parts are glued rather than screwed, and replacement components are sold only to authorized dealers, if at all. Volunteers therefore spend almost as much time recording these designs as fixing them. Repair cafés now send data on failed repairs to European lawmakers, who have used it in debates about right-to-repair rules.",
      "What surprises many first-time visitors is how little of the afternoon is spent on repair itself. Most of it goes to waiting, watching, and talking to a stranger about a machine. A café that mends thirty toasters in a day has done something small for the environment. It may have done something larger for the street it stands on."
    ],
    translations: [
      "毎月第2土曜日、アムステルダムのある公民館は壊れた品物でいっぱいになる。トースター、ランプ、自転車、脚が1本ない椅子。持ち主たちは、直し方を知っているボランティアの隣に座る。お金を払う人もいなければ、ただサービスを受けるだけの人もいない。修理カフェの決まりは、持ち主がテーブルに残り、できる限り自分でドライバーを握る、というものだ。",
      "この運動は2009年にたった1回の催しとして始まり、それ以来、世界2000か所以上に広がった。魅力の一部ははっきりしている。家電製品は、50年前の買い物客なら衝撃を受けたであろう速さで捨てられており、しかも捨てられるもののかなりの部分は、あと少しで動く状態なのだ。",
      "障害も同じくらいはっきりしている。修理しにくい作りの製品もある。部品がねじ留めではなく接着されていたり、交換部品が正規販売店にしか売られていなかったり、そもそも売られていなかったりする。そのためボランティアたちは、修理するのとほぼ同じだけの時間を、こうした設計を記録することに使っている。修理カフェは今、修理できなかった事例のデータをヨーロッパの議員に送っており、議員たちはそれを「修理する権利」をめぐる議論に用いている。",
      "初めて訪れた人の多くが驚くのは、午後の時間のうち修理そのものに使われる部分がいかに少ないかということだ。その大半は、待ち、眺め、見知らぬ人と機械について話すことに費やされる。1日に30台のトースターを直すカフェは、環境のために小さなことをしたことになる。だがそのカフェは、自分が建つ通りのために、もっと大きなことをしたのかもしれない。"
    ],
    glossary: [
      { word: "appeal", meaning: "魅力" },
      { word: "household appliance", meaning: "家電製品" },
      { word: "obstacle", meaning: "障害" },
      { word: "component", meaning: "部品" },
      { word: "authorized dealer", meaning: "正規販売店" },
      { word: "lawmaker", meaning: "議員、立法者" },
      { word: "mend", meaning: "修理する" }
    ],
    keySentences: [
      {
        text: "Household appliances are thrown away at a rate that would have shocked shoppers fifty years ago, and much of what is thrown away is close to working.",
        structure:
          "受動態 are thrown away に、a rate を修飾する関係詞節が続きます。節の中は would have +過去分詞という仮定法で、「もし50年前の買い物客が見たら」という条件が隠れています。後半の what is thrown away は「捨てられるもの」という名詞のかたまりです。",
        translation: "家電製品は、50年前の買い物客なら衝撃を受けたであろう速さで捨てられており、しかも捨てられるものの多くは、あと少しで動く状態なのだ。"
      },
      {
        text: "What surprises many first-time visitors is how little of the afternoon is spent on repair itself.",
        structure:
          "What 節が主語、is が動詞、how 節が補語。「初めての来訪者を驚かせるのは、〜がいかに少ないかということだ」という構造です。how little は「いかに少ないか」。",
        translation: "初めて訪れた人の多くを驚かせるのは、午後のうち修理そのものに使われる時間がいかに少ないかということだ。"
      }
    ],
    questions: [
      {
        id: "repaircafe-q1",
        typeJa: "内容一致",
        variant: "word",
        prompt: "What is the rule of a repair café?",
        options: [
          {
            answer: "The owner of the broken item takes part in the repair.",
            reason: "第1段落の the owner stays at the table and holds the screwdriver が決まりの中身を述べているから",
            correct: true
          },
          {
            answer: "Only volunteers are allowed to touch the tools.",
            reason: "第1段落に volunteers who know how to fix them とあり、直せるのはボランティアだから",
            correct: false
          }
        ],
        evidence: "the owner stays at the table and holds the screwdriver whenever possible",
        explanation:
          "直前の Nobody pays, and nobody is simply served.（ただサービスを受ける人はいない）も同じ内容を別の言い方で示しています。",
        misconception:
          "技術を持っている人＝作業する人、と読み替えています。本文はむしろ、持ち主が作業に加わることを決まりとして挙げています。"
      },
      {
        id: "repaircafe-q2",
        typeJa: "内容一致",
        variant: "word",
        prompt: "Which of the following makes repair difficult?",
        options: [
          {
            answer: "Parts are glued in place and spare components are hard to buy.",
            reason: "第3段落の glued rather than screwed と sold only to authorized dealers, if at all が2つの障害を並べているから",
            correct: true
          },
          {
            answer: "Most broken machines are far too old to be fixed.",
            reason: "修理が難しいと書かれており、古い機械ほど直しにくいから",
            correct: false
          }
        ],
        evidence: "parts are glued rather than screwed, and replacement components are sold only to authorized dealers, if at all",
        explanation:
          "if at all は「もしあるとしても（ほとんどない）」と、前の内容をさらに限定する表現です。",
        misconception:
          "本文は much of what is thrown away is close to working（捨てられるものの多くはあと少しで動く）と逆のことを述べています。障害は製品の設計と部品の入手です。"
      },
      {
        id: "repaircafe-q3",
        typeJa: "内容一致",
        variant: "word",
        prompt: "What do repair cafés send to European lawmakers?",
        options: [
          {
            answer: "Data about repairs that could not be completed",
            reason: "第3段落の send data on failed repairs to European lawmakers がそのまま対応するから",
            correct: true
          },
          {
            answer: "Lists of volunteers who want new rules",
            reason: "ボランティアが記録を取り、議員が規則の議論に使うと書かれているから",
            correct: false
          }
        ],
        evidence: "Repair cafés now send data on failed repairs to European lawmakers",
        explanation:
          "failed repairs は「失敗した修理」、つまり直せなかった事例です。第3段落前半の「設計を記録する」という話ともつながります。",
        misconception:
          "同じ段落にある要素（ボランティア・規則）を組み合わせて作った選択肢です。誰が何を送ったのかを、本文の一文で確かめます。"
      },
      {
        id: "repaircafe-q4",
        typeJa: "推論",
        variant: "reason",
        prompt: "What does the writer imply in the final two sentences?",
        options: [
          {
            answer: "The social value of a repair café may be greater than its environmental value.",
            reason: "最後の2文が something small for the environment と something larger for the street を対比しているから",
            correct: true
          },
          {
            answer: "The social value of a repair café may be greater than its environmental value.",
            reason: "修理カフェは環境のためではなく、地域の交流の場として作られたと書かれているから",
            correct: false
          }
        ],
        evidence: "something small for the environment ... something larger for the street it stands on",
        explanation:
          "small と larger という対比が結論を作っています。筆者は環境への効果を認めたうえで、地域への効果のほうが大きいかもしれないと述べています。",
        misconception:
          "設立の目的について本文は何も述べていません。筆者は環境への効果を認めたうえで、small と larger という程度の対比で締めくくっています。"
      }
    ]
  }
];

module.exports = { readingPassages };

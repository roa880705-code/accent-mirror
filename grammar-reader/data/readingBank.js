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
        type: "detail",
        typeJa: "内容一致",
        prompt: "What did the experiment described in the second paragraph show?",
        choices: [
          "Changing the amount of oxygen or carbon dioxide did not change how often people yawned.",
          "People yawned more when they breathed air with more oxygen.",
          "People stopped yawning when they breathed carbon dioxide.",
          "The volunteers were too tired to take part in the experiment."
        ],
        answerIndex: 0,
        evidence: "Neither change made them yawn more or less.",
        explanation:
          "Neither change made them yawn more or less. が根拠です。neither は「どちらの〜も…ない」という否定なので、酸素を増やしても二酸化炭素を増やしてもあくびの回数は変わらなかった、という意味になります。"
      },
      {
        id: "yawn-q2",
        type: "detail",
        typeJa: "因果関係",
        prompt: "According to the cooling theory, why do people yawn less in very hot weather?",
        choices: [
          "The outside air is too warm to lower the temperature of the brain.",
          "Hot weather makes people too tired to open their mouths.",
          "People breathe more slowly when the weather is hot.",
          "The brain does not get warm at all in hot weather."
        ],
        answerIndex: 0,
        evidence: "when the outside air is too warm to be of any help",
        explanation:
          "too warm to be of any help（暖かすぎて何の役にも立たない）が根拠です。あくびの目的が脳を冷やすことなら、外の空気が暖かいときにはあくびをしても意味がない、という流れです。"
      },
      {
        id: "yawn-q3",
        type: "vocab",
        typeJa: "語彙推測",
        prompt: "In the last paragraph, the word contagious is closest in meaning to",
        choices: [
          "spreading easily from one person to another",
          "lasting for a very long time",
          "difficult to notice",
          "happening only once"
        ],
        answerIndex: 0,
        evidence: "Seeing, hearing, or even reading about a yawn can make you yawn",
        explanation:
          "直前で「あくびを見聞きするだけでこちらもあくびが出る」と説明されているので、contagious は「人から人へうつる」という意味だと推測できます。未知語は前後の言い換えから判断します。"
      },
      {
        id: "yawn-q4",
        type: "main",
        typeJa: "要旨",
        prompt: "Which sentence best describes the main idea of the passage?",
        choices: [
          "The old oxygen explanation of yawning has been replaced by newer ideas about cooling and social behavior.",
          "Yawning is a sign that a person is not getting enough oxygen.",
          "Animals and humans yawn for completely different reasons.",
          "Scientists have finally proved exactly why people yawn."
        ],
        answerIndex: 0,
        evidence: "The old explanation ... A newer theory is that a yawn cools the brain. ... Yawning is also social.",
        explanation:
          "第1段落で古い説を示し、第2段落でそれを否定、第3・4段落で新しい2つの説を示す構成です。全体の流れをまとめた選択肢を選びます。「完全に証明された」とまでは書かれていない点にも注意しましょう。"
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
        type: "main",
        typeJa: "要旨",
        prompt: "What is the main point of the passage?",
        choices: [
          "City bees often do well because cities offer a variety of flowers over a long season.",
          "Bees should be moved from the countryside to cities as soon as possible.",
          "Modern farming has made honey more expensive in cities.",
          "Beekeeping is easier for beginners than most people imagine."
        ],
        answerIndex: 0,
        evidence: "Cities, by contrast, are full of small gardens, parks, and balconies ... so something is in bloom from March to October.",
        explanation:
          "第2段落が中心です。「単一作物の農地では餌の時期が偏るが、都市は多様な植物が長期間咲く」という対比が、都市のミツバチが健康な理由として示されています。"
      },
      {
        id: "citybees-q2",
        type: "detail",
        typeJa: "内容一致",
        prompt: "What problem do bees face in areas where a single crop is grown?",
        choices: [
          "They have far too much food for a short time and almost none afterward.",
          "They cannot find any food at all during the whole year.",
          "They are attacked by other insects that live in the fields.",
          "They have to fly to the city to find water."
        ],
        answerIndex: 0,
        evidence: "When that crop flowers, bees have more food than they can use; when it stops, they have almost nothing.",
        explanation:
          "セミコロン（;）で対比された2文が根拠です。more food than they can use（使い切れないほどの餌）と almost nothing（ほとんど何もない）の落差を読み取ります。"
      },
      {
        id: "citybees-q3",
        type: "detail",
        typeJa: "内容一致",
        prompt: "What do experts advise cities to do?",
        choices: [
          "Plant more flowers before increasing the number of hives.",
          "Remove all hives from crowded districts.",
          "Bring bumblebees into the city from the countryside.",
          "Limit beekeeping to hotels and schools."
        ],
        answerIndex: 0,
        evidence: "Experts now advise cities to plant more flowers before adding more hives.",
        explanation:
          "advise +目的語+ to 不定詞の形で助言の内容が述べられています。before adding more hives（巣箱を増やす前に）という順序まで含めて読み取ります。"
      },
      {
        id: "citybees-q4",
        type: "inference",
        typeJa: "推論",
        prompt: "What does the writer suggest in the last paragraph?",
        choices: [
          "Seeing bees at work changes how city people think about nature.",
          "Advertisements are the best way to protect insects.",
          "People in cities should stop watching bees and start keeping them.",
          "Nature can only be understood far from the city."
        ],
        answerIndex: 0,
        evidence: "People who have watched bees work above a busy street rarely think of nature as something that exists only far away.",
        explanation:
          "rarely（めったに〜ない）という否定語がポイントです。「自然は遠くにだけあるものだ、とは考えなくなる」＝身近なものとして感じるようになる、という含意を読み取ります。"
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
        type: "vocab",
        typeJa: "語句の意味",
        prompt: "What is consolidation, as the passage uses the word?",
        choices: [
          "The process of moving new information into a more lasting form",
          "The act of studying one more chapter before a test",
          "A stage of sleep that comes just before morning",
          "The loss of memories during a long night"
        ],
        answerIndex: 0,
        evidence: "the brain slowly moves new information from short-term storage into a more permanent form, a process called consolidation",
        explanation:
          "a process called consolidation は直前の内容全体を言い換えた同格表現です。called の前にある説明部分をそのまま答えにします。"
      },
      {
        id: "sleep-q2",
        type: "detail",
        typeJa: "内容一致",
        prompt: "What did the study of two groups show?",
        choices: [
          "The group that slept remembered more, although both groups studied for the same length of time.",
          "The group that stayed awake remembered more because it had more practice.",
          "Both groups remembered the same number of words.",
          "The group that slept studied for a longer time than the other group."
        ],
        answerIndex: 0,
        evidence: "even though both groups had spent the same amount of time studying",
        explanation:
          "even though（〜にもかかわらず）が譲歩を示しています。勉強時間が同じだったという条件があるからこそ、差を生んだのは睡眠だと言える、という論理です。"
      },
      {
        id: "sleep-q3",
        type: "detail",
        typeJa: "内容一致",
        prompt: "According to the passage, REM sleep is linked to",
        choices: [
          "skills and seeing connections between ideas.",
          "facts and events only.",
          "the first half of the night.",
          "the amount of time spent studying."
        ],
        answerIndex: 0,
        evidence: "REM sleep, which increases toward morning, is linked to skills and to the ability to see connections between ideas.",
        explanation:
          "深い睡眠（事実・出来事）と REM 睡眠（技能・発想のつながり）の対比です。which increases toward morning は挿入的な説明なので、いったん外して主語と述語を結びます。"
      },
      {
        id: "sleep-q4",
        type: "inference",
        typeJa: "筆者の主張",
        prompt: "Which statement would the writer most likely agree with?",
        choices: [
          "Studying early and then sleeping is better than studying late into the night.",
          "Sleeping longer is always more useful than studying.",
          "Sleep can replace the work of learning new material.",
          "Students should stop worrying about how long they sleep."
        ],
        answerIndex: 0,
        evidence: "The practical advice is simple but unpopular: study earlier, and then go to bed.",
        explanation:
          "最終段落で、筆者は「睡眠は学んだことを守るだけで、知識を作りはしない」と断ったうえで助言をしています。極端な選択肢（always / replace）は本文の留保と矛盾します。"
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
        type: "detail",
        typeJa: "内容一致",
        prompt: "What do the Russian experiments actually measure?",
        choices: [
          "How quickly speakers match colors, not how well their eyes work",
          "How many colors Russian speakers can see",
          "Whether Russian speakers prefer light or dark blue",
          "How long Russian speakers can remember a color"
        ],
        answerIndex: 0,
        evidence: "experiments that measure speed rather than eyesight",
        explanation:
          "rather than（〜ではなく）が対比を作っています。speed（速さ）と eyesight（視力）のどちらを測っているかを読み分ける問題です。"
      },
      {
        id: "colorwords-q2",
        type: "detail",
        typeJa: "内容一致",
        prompt: "What happens when speakers repeat numbers in their heads during the task?",
        choices: [
          "The Russian speakers' small advantage disappears.",
          "The Russian speakers become even faster.",
          "The English speakers begin to see two kinds of blue.",
          "Both groups stop making mistakes."
        ],
        answerIndex: 0,
        evidence: "it disappears when speakers are asked to repeat numbers in their heads",
        explanation:
          "it が指すのは前の文の the difference（ロシア語話者に見られた差）です。指示語が何を受けているかを確認してから選びます。"
      },
      {
        id: "colorwords-q3",
        type: "detail",
        typeJa: "具体例の役割",
        prompt: "Why does the writer mention the Japanese word ao?",
        choices: [
          "To show that the boundaries between color words can shift over time",
          "To prove that Japanese speakers cannot tell green from blue",
          "To argue that Japanese has more color words than English",
          "To explain why traffic lights were first invented"
        ],
        answerIndex: 0,
        evidence: "Japanese offers a familiar example of how such boundaries shift.",
        explanation:
          "具体例の前後には、その例が何を示すためのものかを述べる文が置かれます。ここでは a familiar example of how such boundaries shift が役割を明示しています。"
      },
      {
        id: "colorwords-q4",
        type: "main",
        typeJa: "要旨",
        prompt: "Which statement best sums up the passage?",
        choices: [
          "Language influences how quickly we sort colors, though it does not change what the eye sees.",
          "People who speak different languages see completely different rainbows.",
          "Color words are the same in every language once you look closely.",
          "Scientists cannot measure any effect of language on color."
        ],
        answerIndex: 0,
        evidence: "language is not changing the eye; it is offering a shortcut",
        explanation:
          "本文は「影響はあるが、目の働き自体を変えるほどではない」という限定つきの主張です。completely different のような言い過ぎの選択肢と、効果を全否定する選択肢の両方を外します。"
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
        type: "detail",
        typeJa: "内容一致",
        prompt: "What is the rule of a repair café?",
        choices: [
          "The owner of the broken item takes part in the repair.",
          "Visitors must pay a small fee for each repair.",
          "Only volunteers are allowed to touch the tools.",
          "Each visitor may bring only one item a year."
        ],
        answerIndex: 0,
        evidence: "the owner stays at the table and holds the screwdriver whenever possible",
        explanation:
          "直前の Nobody pays, and nobody is simply served. も手がかりです。「サービスを受けるだけの客はいない」＝持ち主も作業に加わる、という流れになっています。"
      },
      {
        id: "repaircafe-q2",
        type: "detail",
        typeJa: "内容一致",
        prompt: "Which of the following makes repair difficult, according to the passage?",
        choices: [
          "Parts are glued in place and spare components are hard to buy.",
          "Volunteers are not allowed to use screwdrivers.",
          "Most broken machines are far too old to be fixed.",
          "European rules forbid the repair of household appliances."
        ],
        answerIndex: 0,
        evidence: "parts are glued rather than screwed, and replacement components are sold only to authorized dealers, if at all",
        explanation:
          "if at all は「もし売られているとしても（そもそも売られていないことも多い）」という強い限定を加える表現です。"
      },
      {
        id: "repaircafe-q3",
        type: "detail",
        typeJa: "内容一致",
        prompt: "What do repair cafés send to European lawmakers?",
        choices: [
          "Data about repairs that could not be completed",
          "The broken appliances themselves",
          "Lists of volunteers who want new rules",
          "Money collected from visitors"
        ],
        answerIndex: 0,
        evidence: "Repair cafés now send data on failed repairs to European lawmakers",
        explanation:
          "failed repairs は「失敗した修理」＝直せなかった事例です。第3段落の「記録に時間を使う」という内容ともつながっています。"
      },
      {
        id: "repaircafe-q4",
        type: "inference",
        typeJa: "推論",
        prompt: "What does the writer imply in the final two sentences?",
        choices: [
          "The social value of a repair café may be greater than its environmental value.",
          "Repair cafés should fix more than thirty toasters a day.",
          "Repairing toasters does nothing to help the environment.",
          "Streets with repair cafés have fewer broken machines."
        ],
        answerIndex: 0,
        evidence: "something small for the environment ... something larger for the street it stands on",
        explanation:
          "something small と something larger の対比が答えを決めます。環境への効果を否定しているのではなく、地域社会への効果のほうが大きいかもしれない、と述べている点に注意します。"
      }
    ]
  }
];

module.exports = { readingPassages };

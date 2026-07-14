const speechSdk = require("microsoft-cognitiveservices-speech-sdk");

function assertAzureConfig() {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    const error = new Error(".env に Key と Region を設定してください。");
    error.statusCode = 500;
    throw error;
  }

  if (/[\u3040-\u30ff\u3400-\u9fff]/.test(key)) {
    const error = new Error("AZURE_SPEECH_KEY に日本語が含まれています。");
    error.statusCode = 500;
    throw error;
  }

  return { key, region };
}

function assessPronunciationFromWav(audioBuffer, referenceText) {
  const { key, region } = assertAzureConfig();

  return new Promise((resolve, reject) => {
    let recognizer;
    let pronunciationConfig;
    const speechConfig = speechSdk.SpeechConfig.fromSubscription(key, region);
    speechConfig.speechRecognitionLanguage = "en-US";
    speechConfig.outputFormat = speechSdk.OutputFormat.Detailed;

    try {
      const audioConfig = speechSdk.AudioConfig.fromWavFileInput(audioBuffer);
      recognizer = new speechSdk.SpeechRecognizer(speechConfig, audioConfig);
      pronunciationConfig = new speechSdk.PronunciationAssessmentConfig(
        referenceText,
        speechSdk.PronunciationAssessmentGradingSystem.HundredMark,
        speechSdk.PronunciationAssessmentGranularity.Phoneme,
        true
      );

      pronunciationConfig.enableProsodyAssessment = true;
      pronunciationConfig.phonemeAlphabet = "IPA";
      pronunciationConfig.nbestPhonemeCount = 5;
      pronunciationConfig.applyTo(recognizer);

      recognizer.recognizeOnceAsync(
        (result) => {
          try {
            if (result.reason === speechSdk.ResultReason.RecognizedSpeech) {
              const assessment = speechSdk.PronunciationAssessmentResult.fromResult(result);
              const rawJson = result.properties.getProperty(speechSdk.PropertyId.SpeechServiceResponse_JsonResult) || "{}";
              resolve({
                text: result.text,
                assessment: {
                  accuracyScore: assessment.accuracyScore,
                  fluencyScore: assessment.fluencyScore,
                  completenessScore: assessment.completenessScore,
                  prosodyScore: assessment.prosodyScore,
                  pronunciationScore: assessment.pronunciationScore
                },
                raw: JSON.parse(rawJson)
              });
              return;
            }

            if (result.reason === speechSdk.ResultReason.NoMatch) {
              reject(new Error("音声を認識できませんでした。もう一度試してください。"));
              return;
            }

            reject(new Error(`Azure recognition failed: ${result.reason}`));
          } catch (error) {
            reject(error);
          } finally {
            if (recognizer) recognizer.close();
            if (pronunciationConfig) pronunciationConfig.close();
          }
        },
        (error) => {
          if (recognizer) recognizer.close();
          if (pronunciationConfig) pronunciationConfig.close();
          reject(new Error(String(error)));
        }
      );
    } catch (error) {
      if (recognizer) recognizer.close();
      if (pronunciationConfig) pronunciationConfig.close();
      reject(error);
    }
  });
}

function recognizeEnglishFromWav(audioBuffer) {
  const { key, region } = assertAzureConfig();

  return new Promise((resolve, reject) => {
    let recognizer;
    const speechConfig = speechSdk.SpeechConfig.fromSubscription(key, region);
    speechConfig.speechRecognitionLanguage = "en-US";
    speechConfig.outputFormat = speechSdk.OutputFormat.Detailed;

    try {
      const audioConfig = speechSdk.AudioConfig.fromWavFileInput(audioBuffer);
      recognizer = new speechSdk.SpeechRecognizer(speechConfig, audioConfig);

      recognizer.recognizeOnceAsync(
        (result) => {
          try {
            if (result.reason === speechSdk.ResultReason.RecognizedSpeech) {
              const rawJson = result.properties.getProperty(speechSdk.PropertyId.SpeechServiceResponse_JsonResult) || "{}";
              resolve({
                text: result.text || "",
                raw: JSON.parse(rawJson)
              });
              return;
            }

            if (result.reason === speechSdk.ResultReason.NoMatch) {
              resolve({ text: "", raw: {}, noMatch: true });
              return;
            }

            reject(new Error(`Azure free recognition failed: ${result.reason}`));
          } catch (error) {
            reject(error);
          } finally {
            if (recognizer) recognizer.close();
          }
        },
        (error) => {
          if (recognizer) recognizer.close();
          reject(new Error(String(error)));
        }
      );
    } catch (error) {
      if (recognizer) recognizer.close();
      reject(error);
    }
  });
}

module.exports = { assessPronunciationFromWav, recognizeEnglishFromWav, assertAzureConfig };

import React, { useEffect, useRef, useState } from "react";
import { PitchDetector } from "pitchy";
import { Temperament } from "temperament";
import BrowserOnly from "@docusaurus/BrowserOnly";
import styles from "./HomepageSample.module.css";

const equalTemperament = new Temperament({
  name: "Equal temperament",
  description: "Standard twelve-tone equal temperament.",
  source:
    "https://en.wikipedia.org/wiki/Equal_temperament#Twelve-tone_equal_temperament",
  referenceName: "A",
  referencePitch: 440,
  referenceOctave: 4,
  octaveBaseName: "C",
  notes: {
    C: ["C", 0],
    "C♯": ["C", 100],
    D: ["C♯", 100],
    "E♭": ["D", 100],
    E: ["E♭", 100],
    F: ["E", 100],
    "F♯": ["F", 100],
    G: ["F♯", 100],
    "G♯": ["G", 100],
    A: ["G♯", 100],
    "B♭": ["A", 100],
    B: ["B♭", 100],
  },
});

function Background({ analyserNode }) {
  const ref = useRef(null);
  const data = useRef(new Float32Array(analyserNode.current.fftSize));

  useEffect(() => {
    const render = () => {
      const canvas = ref.current;

      const width = (canvas.width = canvas.parentNode.clientWidth);
      const height = (canvas.height = canvas.parentNode.clientHeight);

      analyserNode.current.getFloatTimeDomainData(data.current);

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = "#777";
      ctx.beginPath();
      const stepSize = width / (data.current.length - 1);
      const x = (i) => i * stepSize;
      const y = (value) => height / 2 + (height / 4) * value;
      ctx.moveTo(x(0), y(data[0]));
      for (let i = 1; i < data.current.length; i++) {
        ctx.lineTo(x(i), y(data.current[i]));
      }
      ctx.stroke();
    };

    const handle = setInterval(render, 1000 / 30);
    return () => clearInterval(handle);
  }, []);

  return <canvas ref={ref} className={styles.background}></canvas>;
}

function Note({ audioContext, analyserNode }) {
  const data = useRef(new Float32Array(analyserNode.current.fftSize));
  const detector = useRef(PitchDetector.forFloat32Array(data.current.length));

  const [pitch, setPitch] = useState(null);
  const [clarity, setClarity] = useState(null);

  useEffect(() => {
    const update = () => {
      analyserNode.current.getFloatTimeDomainData(data.current);
      const [currentPitch, currentClarity] = detector.current.findPitch(
        data.current,
        audioContext.current.sampleRate
      );
      setPitch(currentPitch);
      setClarity(currentClarity);
    };

    const handle = setInterval(update, 100);
    return () => clearInterval(handle);
  }, []);

  const clarityThreshold = 0.85;
  const opacity =
    clarity >= clarityThreshold
      ? (clarity - clarityThreshold) / (1 - clarityThreshold)
      : 0;
  const [note, offset] =
    clarity >= clarityThreshold
      ? equalTemperament.getNoteNameFromPitch(pitch)
      : ["", 0];
  const cents = Math.round(offset);
  const formattedCents =
    (cents >= 0 ? "+" : "") +
    cents +
    " cent" +
    (Math.abs(cents) == 1 ? "" : "s");

  return (
    <div className={styles.noteContainer} style={{ opacity }}>
      <div className={styles.noteName}>{note}</div>
      <div className={styles.noteOffset}>{formattedCents}</div>
    </div>
  );
}

export default function HomepageSample() {
  return (
    <BrowserOnly>
      {() => {
        const [started, setStarted] = useState(false);

        const audioContext = useRef(new AudioContext());
        const analyserNode = useRef(audioContext.current.createAnalyser());

        const startAnalyser = async () => {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          const sourceNode =
            audioContext.current.createMediaStreamSource(stream);
          sourceNode.connect(analyserNode.current);
          await audioContext.current.resume();
          setStarted(true);
        };

        return (
          <div className={styles.sample}>
            <Background analyserNode={analyserNode} />
            {started ? (
              <Note audioContext={audioContext} analyserNode={analyserNode} />
            ) : (
              <button
                className="button button--primary button--lg"
                onClick={startAnalyser}
              >
                Try It 🎤
              </button>
            )}
          </div>
        );
      }}
    </BrowserOnly>
  );
}

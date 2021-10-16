import React, { useEffect, useState } from "react";
import CodeBlock from "@theme/CodeBlock";
import styles from "./Example.module.css";

export default function Example({ source, frameHeight = "400px" }) {
  return (
    <>
      <iframe
        className={styles.frame}
        style={{
          width: "100%",
          height: frameHeight,
        }}
        srcDoc={source}
      ></iframe>
      <h2>Source</h2>
      <CodeBlock className="language-html">{source}</CodeBlock>
    </>
  );
}

"use client";
// import RichTextEditor from 'react-rte';
import dynamic from "next/dynamic";
const RichTextEditor = dynamic(() => import("react-rte"), {
  ssr: false,
}) as any;

import React from "react";

interface MyRichTextEditorProps {
  value?: string;
  onChange: (e: string) => void;
}

const MyRichTextEditor: React.FC<MyRichTextEditorProps> = ({
  value = "",
  onChange,
}) => {
  return (
    <>
      {/* <RichTextEditor
        value={value}
        onChange={(e) => {
          // console.log(e.toString('html'));
          // onChange(e.toString('html'))
        }}
      /> */}
    </>
  );
};
export default MyRichTextEditor;

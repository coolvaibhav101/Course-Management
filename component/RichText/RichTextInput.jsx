"use client";
import React, { useRef } from "react";
import dynamic from "next/dynamic";
import PropTypes from "prop-types";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <p>Loading editor...</p>,
});


const toolbarOptions = [
  // Font + Size
  [{ font: [] }, { size: ["small", false, "large", "huge"] }],

  // Text styles
  ["bold", "italic", "underline", "strike", "blockquote", "code-block"],

  // Color + Background
  [{ color: [] }, { background: [] }],

  // Script
  [{ script: "sub" }, { script: "super" }],

  // Headers
  [{ header: [1, 2, 3, 4, 5, 6, false] }],

  // Lists
  [{ list: "ordered" }, { list: "bullet" }],

  // Indent
  [{ indent: "-1" }, { indent: "+1" }],

  // Text Direction + Alignment
  [{ direction: "rtl" }, { align: [] }],

  // Links + Media
  ["link", "image", "video"],

  // Clear formatting
  ["clean"],
];

const RichTextInput = ({
  value = "",
  onChange = () => {},
  onBlur = () => {},
  err = "",
  isDisabled = false,
}) => {
  const quillRef = useRef(null);

  const createMarkup = (content) => {
    if (typeof window !== "undefined") {
      const DOMPurify = require("dompurify");
      return { __html: DOMPurify.sanitize(content) };
    }
    return { __html: content };
  };

  const handleBlur = (range) => {
    if (!range) {
      onBlur();
    }
  };

  const modules = {
    toolbar: toolbarOptions,
    clipboard: {
      matchVisual: true,
    },
  };

  const handleContainerClick = () => {
    if (!isDisabled && quillRef.current) {
      const editor = quillRef.current.getEditor?.();
      if (editor) {
        editor.focus();
      }
    }
  };

  const handleChange = (newHtml, delta, source) => {
    if (source === "user") {
      onChange(newHtml);
    }
  };
  return (
    <div>
      <div className="rich-text-container" onClick={handleContainerClick}>
        {!isDisabled ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <style>
              {`
                  .quill-resizable {
                    resize: vertical;
                    overflow: auto;
                    min-height: 160px;
                    max-height: 70vh;
                    border: 1px solid #ced4da;
                    border-radius: 8px;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    cursor: text;
                  }

                  .quill-custom .ql-toolbar {
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    background-color: white;
                    border-top-left-radius: 8px;
                    border-top-right-radius: 8px;
                  }

                  .ql-toolbar.ql-snow {
                    border-top:none;
                    border-left:none;
                    border-right:none;
                    border-bottom: 1px solid #ccc;
                  }

                  .quill-custom .ql-container {
                    border: none;
                    flex-grow: 1;
                    overflow-y: auto;
                  }

                  .quill-custom .ql-editor {
                    height: 100%;
                    color: black;
                  }

                  @media (max-width: 576px) {
                    .quill-resizable {
                      min-height: 35vh !important;
                    }
                  }
                `}
            </style>
            <div className="quill-resizable">
              <div className="quill-custom" style={{ height: "100%" }}>
                <ReactQuill
                  ref={quillRef}
                  value={value}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  preserveWhitespace={true}
                  modules={modules}
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            className="rich-text-readonly p-2"
            style={{
              border: value ? "1px solid #ced4da" : "",
              borderRadius: "8px",
            }}
            dangerouslySetInnerHTML={createMarkup(value)}
          />
        )}
      </div>
      {err && <div className="invalid-feedback d-block">{err}</div>}
    </div>
  );
};

RichTextInput.propTypes = {
  // d3Data: PropTypes.shape({
  //   name: PropTypes.string.isRequired,
  //   columnName: PropTypes.string.isRequired,
  //   validation: PropTypes.array,
  // }).isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  err: PropTypes.string,
  isUpdateScreen: PropTypes.bool,
};

RichTextInput.defaultProps = {
  value: "",
  onBlur: () => {},
  err: "",
  isUpdateScreen: false,
};

export default RichTextInput;

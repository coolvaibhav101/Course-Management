import { FC } from "react";

interface RichTextInputProps {
  value?: string;
  onChange?: (html: string) => void;
  onBlur?: () => void;
  err?: string;
  isDisabled?: boolean;
}

declare const RichTextInput: FC<RichTextInputProps>;

export default RichTextInput;

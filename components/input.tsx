import classNames from "classnames";

type InputProps = {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string
	className?: string
}

const Input: React.FC<InputProps> = ({ value, onChange, placeholder, className }) => {
	return <input className={classNames("px-2 py-1 w-full rounded border focus-visible:outline-none", className)} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
}

export default Input
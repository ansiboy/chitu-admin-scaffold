import React = require("react");
import { ValidateDataField } from "assert/index";
import { ItemPageContext } from "../index";

interface InputFieldProps<T> {
    dataField: keyof T, label: string, name?: string,
    placeholder?: string, type?: 'text' | 'password',
}

export class TextInput<T> extends React.Component<InputFieldProps<T> & ValidateDataField> {
    input: HTMLInputElement;
    constructor(props) {
        super(props)

        this.state = { dataItem: {} }
    }
    get value() {
        return this.input.value
    }
    render() {
        let { dataField, label, name, placeholder } = this.props
        return <ItemPageContext.Consumer>
            {args => {
                let dataItem = args.dataItem || {}
                return <div className="input-control">
                    <label>{label}</label>
                    <span>
                        <input name={name || dataField as string} className="form-control"
                            placeholder={placeholder} type={this.props.type}
                            ref={e => {
                                if (!e) return
                                this.input = e
                                e.value = dataItem[dataField] || ''
                                e.onchange = () => {
                                    dataItem[dataField] = e.value
                                }
                            }} />
                    </span>
                </div>
            }}
        </ItemPageContext.Consumer>
    }
}

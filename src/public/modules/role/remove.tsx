import { ButtonInvokeArguments } from "data-component/common";
import { dataSources } from "assert/dataSources";
import * as ui from "maishu-ui-toolkit";
import { Role } from "entities";
import { Buttons } from "assert/buttons";

export default function (args: ButtonInvokeArguments<Role>) {
    return Buttons.createListDeleteButton(() => {
        ui.confirm({
            title: "提示", message: `确定删除角色'${args.dataItem.name}'吗?`,
            confirm: () => {
                return dataSources.role.delete(args.dataItem);
            }
        })
    })
}
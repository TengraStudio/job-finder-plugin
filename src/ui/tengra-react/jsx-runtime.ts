const React = window.React;

export const Fragment = React.Fragment;

interface JsxProps extends React.Attributes {
    children?: React.ReactNode;
}

function createReactElement(type: React.ElementType, props: JsxProps, key?: React.Key): React.ReactElement {
    const { children, ...restProps } = props;
    const elementProps = key === undefined ? restProps : { ...restProps, key };

    return Array.isArray(children)
        ? React.createElement(type, elementProps, ...children)
        : React.createElement(type, elementProps, children);
}

export function jsx(type: React.ElementType, props: JsxProps, key?: React.Key): React.ReactElement {
    return createReactElement(type, props, key);
}

export function jsxs(type: React.ElementType, props: JsxProps, key?: React.Key): React.ReactElement {
    return createReactElement(type, props, key);
}

export function jsxDEV(type: React.ElementType, props: JsxProps, key?: React.Key): React.ReactElement {
    return createReactElement(type, props, key);
}

"use strict";

const path = require("path");

module.exports = () => {
    return {
        // Mode needs to be set for webpack to work correctly
        mode: "production",

        // The application entry point
        entry: path.resolve(__dirname, "src", "components", "index.ts"),
        output: {
            path: path.resolve(__dirname, "dist"),
            filename: "lazylogs.bundle.js",
        },
        // File extensions to support resolving
        resolve: {
            extensions: [".ts", ".tsx", ".js", ".jsx"],
        },
        devtool: "source-map",
        module: {
            rules: [
                {
                    test: /\.css$/i,
                    use: [
                        "style-loader",
                        {
                            loader: "@teamsupercell/typings-for-css-modules-loader",
                            options: {},
                        },
                        {
                            loader: "css-loader",
                            options: {
                                modules: true,
                            },
                        },
                    ],
                },
                {
                    test: /\.tsx?$/,
                    use: "ts-loader",
                    exclude: /node_modules/,
                },
                {
                    test: /\.(jsx|js)$/,
                    include: path.resolve(__dirname, "src"),
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: "babel-loader",
                            options: {
                                presets: [
                                    [
                                        "@babel/preset-env",
                                        {
                                            targets: "defaults",
                                        },
                                    ],
                                    "@babel/preset-react",
                                ],
                            },
                        },
                    ],
                },
            ],
        },
    };
};

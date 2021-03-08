module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": [
        "airbnb-base",
        "prettier"
      ],
    "parserOptions": {
        "ecmaVersion": 12,
        "sourceType": "module"
    },
    "ignorePatterns": ["taxonomy_retriever.js", ".*.js", "bin/*"],
    "rules": {
        "camelcase": ["off"]
    }
};

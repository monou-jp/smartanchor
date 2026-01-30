# SmartAnchor

**SmartAnchor** は、  
**固定ヘッダ（position: fixed / sticky）があるサイトでも正しく動作する、超軽量アンカーリンク補正ライブラリ**です。

既存サイトに **後付けで 1 ファイル読み込むだけ** で、

- #anchor ジャンプがヘッダに隠れる問題
- 目次リンクのスクロール位置ズレ

を一括で解決します。

---

## デモ

以下のURLより、実際の動作を確認できるデモページをご覧いただけます。

[https://monou-jp.github.io/smartanchor/](https://monou-jp.github.io/smartanchor/)


ローカルで確認する場合は、`docs/index.html` をブラウザで開いてください。

----

## 特徴

- Vanilla JavaScript（依存ライブラリなし）
- 1ファイル完結
- `<script src="smartanchor.js" defer></script>` だけで動作
- ES5 寄りで古めのブラウザでも壊れにくい
- CSP が厳しいサイトでも使いやすい設計
- HTML / CSS をほぼ変更せずに導入可能
- LP / コーポレート / WordPress / 静的サイト向け

---

## なぜこの問題が起きるのか（fixed header 問題）

ブラウザ標準のアンカーリンク（`#anchor`）は、

> **対象要素の上端を viewport の上端に合わせる**

という仕様で動作します。

しかし、`position: fixed` や `position: sticky` のヘッダがある場合、  
viewport の上端は **ヘッダに覆われている**ため、

- ジャンプ先の見出しが隠れる
- 目次リンクの位置がズレる

といった問題が発生します。

---

## CSS での対処（scroll-margin-top 等）との違い

### CSS での対処例

```
h2 {
scroll-margin-top: 72px;
}
```

**メリット**
- JavaScript 不要
- シンプル

**デメリット**
- 既存 HTML / CSS の修正が必要
- 全見出しに適用するのが難しいケースがある
- WordPress や既存 LP では導入コストが高い
- 後付けで一括対応しにくい

---

## SmartAnchor（JS）で解決するメリット / デメリット

### メリット

- 既存 HTML / CSS をほぼ触らずに導入可能
- 1ファイル後付けで全アンカーを一括補正
- サイト構成・CMSを問わず使える
- 特定リンクのみ除外など、制作現場向けの逃げ道がある

### デメリット

- JavaScript に依存する
- ヘッダの高さが動的に変わる場合は offset 調整が必要

---

## なぜ SPA 前提ではないのか

SmartAnchor は、

- LP
- コーポレートサイト
- WordPress
- 静的サイト

といった **「既存サイトに後付けで入れる」用途**を最優先に設計されています。

SPA（React / Vue など）では、

- ルーティング
- スクロール制御
- 描画タイミング

がフレームワーク側の責務になるため、  
本ライブラリの「軽量・単機能」という思想から対象外としています。

---

## インストール

### 最小構成（推奨）

```
<script>
  window.SMARTANCHOR_CONFIG = {
    offset: 72,
    autoInit: true
  };
</script>
<script src="smartanchor.js" defer></script>
```

---

## 使い方

### 基本

```
smartAnchor({
offset: 72,
duration: 300,
easing: "easeOut",
selector: 'a[href^="#"]'
});
```

---

## 設定オプション

| option | type | default | 説明 |
|------|------|---------|------|
| offset | number | 0 | 固定ヘッダの高さ |
| selector | string | a[href^="#"] | 対象リンク |
| animate | boolean | true | スクロールアニメーション |
| duration | number | 280 | アニメーション時間（ms） |
| easing | string | easeOut | linear / easeOut / easeInOut |
| updateHash | boolean | true | URLハッシュを更新 |
| historyMode | string | push | push / replace |
| focus | boolean | true | スクロール後にフォーカス |
| autoOffset | boolean | false | ヘッダ高さ自動推定 |
| headerSelector | string | header | autoOffset 用 |
| ignoreAttr | string | data-smartanchor-ignore | 個別除外用 |
| autoInit | boolean | false | 自動初期化 |

---

## よくあるケース

### 固定ヘッダ

```
window.SMARTANCHOR_CONFIG = {
offset: 72,
autoInit: true
};
```

### sticky ヘッダ

```
smartAnchor({
offset: 56
});
```

### 特定リンクを無効化

```
<a href="#section" data-smartanchor-ignore>通常ジャンプ</a>
```

---

## ライセンス

BSD 3-Clause License

---

## コンセプト

SmartAnchor は、

> **後付け・軽量・制作現場向け**

という思想を最優先に設計されています。

既存サイトで「アンカーがズレる」  
その **一点だけを確実に解決する**ための小さな道具です。

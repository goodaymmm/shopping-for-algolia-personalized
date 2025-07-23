# アンインストール手順

## Shopping for Algolia Personalized アプリケーションの完全削除

### 1. Algoliaインデックスの削除

アプリケーションで使用したAlgoliaのデータを完全に削除するには：

1. [Algoliaダッシュボード](https://www.algolia.com/dashboard)にログイン
2. 使用しているアプリケーションを選択
3. 以下のインデックスを削除：
   - `fashion`
   - `electronics`
   - `products`
   - `beauty`（作成されている場合）
   - `sports`（作成されている場合）
   - `books`（作成されている場合）
   - `home`（作成されている場合）
   - `food`（作成されている場合）

**注意**: インデックスを削除すると、そのインデックス内のすべてのデータが永久に削除されます。

### 2. ローカルデータベースの削除

アプリケーションのローカルデータを削除：

**Windows:**
```bash
rmdir /s /q "%USERPROFILE%\.shopping-ai"
```

**macOS/Linux:**
```bash
rm -rf ~/.shopping-ai
```

### 3. アプリケーションの削除

**インストーラーを使用した場合:**
- Windowsの「プログラムの追加と削除」から「Shopping for Algolia Personalized」を削除

**ポータブル版の場合:**
- アプリケーションフォルダを削除

### 4. 設定ファイルの削除（オプション）

システムに保存された設定を完全に削除する場合：

**Windows:**
```bash
rmdir /s /q "%APPDATA%\shopping-for-algolia-personalized"
```

**macOS:**
```bash
rm -rf ~/Library/Application\ Support/shopping-for-algolia-personalized
rm -rf ~/Library/Preferences/com.shopping-ai.personalized.plist
```

**Linux:**
```bash
rm -rf ~/.config/shopping-for-algolia-personalized
```

### 5. APIキーの削除

保存されたAPIキー（Gemini、Algolia）は、keytarを使用してシステムのキーチェーンに保存されています。これらを削除するには：

**Windows:** 資格情報マネージャーから「shopping-ai」で始まる項目を削除
**macOS:** キーチェーンアクセスから「shopping-ai」で始まる項目を削除
**Linux:** 使用しているキーリング管理ツールから削除

## データの再インストール

アプリケーションを再インストールする場合、Algoliaインデックスは自動的に再作成され、最適化されたデータが自動的にロードされます。

## トラブルシューティング

### 古いデータが残っている場合

もし再インストール後に古いデータ（example.comのURLなど）が表示される場合：

1. 上記の手順でAlgoliaインデックスを完全に削除
2. アプリケーションを再起動
3. 初回起動時に新しいデータが自動的にロードされます

### 検索テストの推奨事項

アプリケーションの検索機能をテストする際は、以下のブランドを使用することを推奨します（実際のデータセットに含まれています）：

- **Adidas** - 572製品（主にファッションカテゴリ）
- **ASICS** - 35製品
- **Reebok** - 1製品
- **Champion** - 1製品

**注意**: Nike製品は現在のデータセットにほとんど含まれていないため、検索テストには適していません。
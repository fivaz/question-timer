## [1.1.1](https://github.com/fivaz/question-timer/compare/v1.1.0...v1.1.1) (2026-07-24)

### 🧹 Chores

* show app version at bottom of settings drawer ([d52e2fb](https://github.com/fivaz/question-timer/commit/d52e2fba94a369b02d4a05c2fa5a5ed0ffb9feaa))

## [1.1.0](https://github.com/fivaz/question-timer/compare/v1.0.0...v1.1.0) (2026-07-24)

### ✨ Features

* continue question numbers from previous block's last finished ([18cf579](https://github.com/fivaz/question-timer/commit/18cf579134d611e85bfd9078acc7ba61e1d4e6fe))

### 🐛 Bug Fixes

* allow scrolling inside desktop phone shell ([8b3328e](https://github.com/fivaz/question-timer/commit/8b3328e0d200720e397ffbd445c7786f7a673ad3))
* ignore exiting blocks when picking next start number ([62bcb78](https://github.com/fivaz/question-timer/commit/62bcb785831eb55f725bcc62f0ecba3ac3bd169c))

## 1.0.0 (2026-07-23)

### ✨ Features

* add bottom settings drawer for defaults and theme ([2e86b3c](https://github.com/fivaz/question-timer/commit/2e86b3c41adaea5880513c60b6a5fa401cb18a56))
* add grip drag-and-drop reordering for question rows ([0dd6a85](https://github.com/fivaz/question-timer/commit/0dd6a8572338140d75804ef2cc4ab6934f84adc0))
* add question timer with average trend and progress ([a0c7dd4](https://github.com/fivaz/question-timer/commit/a0c7dd4d75cb2db4bbbf74e5fc16a50f931c6fe3))
* add skip control to move questions to end of list ([2de83d5](https://github.com/fivaz/question-timer/commit/2de83d51708601e71fc8b5419be05217aa85731b))
* add system/light/dark theme menu next to sign out ([bb69b4e](https://github.com/fivaz/question-timer/commit/bb69b4eceed4732f7710841e3c9b8d6c656a44c3))
* animate newly created study blocks on entrance ([91d2adf](https://github.com/fivaz/question-timer/commit/91d2adf0e9d8b3cb8df89bc7e5707d74de8546c1))
* animate skipped questions moving to end of list ([7870572](https://github.com/fivaz/question-timer/commit/787057254c30b35f131e032d7006b29f53fb4623))
* animate study blocks on soft-delete exit ([c385497](https://github.com/fivaz/question-timer/commit/c385497a13e083815879e7ce9a460b02aef60849))
* cascade renumber from first question before any finishes ([0daac4d](https://github.com/fivaz/question-timer/commit/0daac4d9c9f3dca5a623a9a4338891de0ba89657))
* compact header actions and single-row block fields ([36c399b](https://github.com/fivaz/question-timer/commit/36c399b0e86000488abc8f3c372ec555f48cf396))
* confirm before signing out ([135609d](https://github.com/fivaz/question-timer/commit/135609db9c0ace9d9dc68df4027102d49539b544))
* long-press finished control to edit finish time ([457d372](https://github.com/fivaz/question-timer/commit/457d37287ade06478f5901f92957800abc775997))
* make every question number independently editable ([88f6431](https://github.com/fivaz/question-timer/commit/88f6431dda3f74bdbf170297b22c471f9f4f8276))
* persist study blocks in Firestore with google auth ([833fa4f](https://github.com/fivaz/question-timer/commit/833fa4fd70451bfaafd9574c7771ebc04bd6805f))
* replace question skip with animated row delete ([bb57910](https://github.com/fivaz/question-timer/commit/bb57910cab44271d34b06148ae9e6794af4b779a))
* soft-delete study blocks with confirm and undo ([dfa0cb0](https://github.com/fivaz/question-timer/commit/dfa0cb029a29d17e7111a6e1bbd38156bb5df205))
* support multiple study blocks in a vertical newest-first layout ([4a33295](https://github.com/fivaz/question-timer/commit/4a3329540e42b76b2aaf3a156a486eb0ce36f0fd))
* sync study blocks live with Firestore onSnapshot ([2b44c95](https://github.com/fivaz/question-timer/commit/2b44c954eb71f75acb686779b96991faf8eb1211))

### 🐛 Bug Fixes

* generate block ids without secure-context randomUUID ([88df6be](https://github.com/fivaz/question-timer/commit/88df6be602d0b355c994f8e6bc8a296f89eaf4da))
* pin settings drawer to viewport bottom ([2f51820](https://github.com/fivaz/question-timer/commit/2f51820069fab67ce255de28aab9929304c97740))
* preserve finished questions when shrinking question count ([2878df8](https://github.com/fivaz/question-timer/commit/2878df894728ec8d159ac1f5324d68c99b362000))
* preserve question numbers when skipping rows to end ([b452e92](https://github.com/fivaz/question-timer/commit/b452e92c9b04ec07c9c19d0bb4c128f35eb67578))
* type listBlocks map as StudyBlock | null ([18cb550](https://github.com/fivaz/question-timer/commit/18cb550ac747c7105dc5c153b3d53ca9b56fcc81))
* use digit-only text inputs for question counts ([a3049cb](https://github.com/fivaz/question-timer/commit/a3049cb4169aae79971c02d81bfa18cd6afe495d))
* use startedAt so past blocks show correct Q1 Took/Avg ([a112718](https://github.com/fivaz/question-timer/commit/a112718f5d24ea08eec50e3e506beec85bbfe2b3))
* use white backgrounds on editable study-block inputs ([b16d6cd](https://github.com/fivaz/question-timer/commit/b16d6cd03e8f3429bada7f97a4921b2a537f9a31))

### 🧹 Chores

* add dev:network script for LAN host + open ([f41e22c](https://github.com/fivaz/question-timer/commit/f41e22c951d8a3eab924a51a447ea7ef4ffc483d))
* constrain layout to phone-width mobile shell ([deb7300](https://github.com/fivaz/question-timer/commit/deb73000c8f3b5411defa1f0468e73663a04f310))
* generate PWA icons and favicon from SVG via sharp ([8d2b31c](https://github.com/fivaz/question-timer/commit/8d2b31c45ac69cfefc6dc8ed1d2511a5c4e20925))
* switch package manager from npm to pnpm ([5479f0b](https://github.com/fivaz/question-timer/commit/5479f0b2685f6aaf082f1470a8f18291ba91b468))

### 💄 Styles

* improve center inputs ([36e2474](https://github.com/fivaz/question-timer/commit/36e247429cec1d85585e71a2df295b93219d8468))

### 🔨 Code Refactoring

* split study timer into components and lib modules ([5bbee0b](https://github.com/fivaz/question-timer/commit/5bbee0b4f06e778c86142b9e3c465cb198587048))

### 🔧 Continuous Integration

* automate GitHub releases with semantic-release and conventional commits ([21fcc18](https://github.com/fivaz/question-timer/commit/21fcc18334022734d0f6a612fe8007e6728ca7fb))

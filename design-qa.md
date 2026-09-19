# iPhone 14 Pro Home Layout Design QA

- Source visual truth: `/var/folders/7b/n2t6d2yn1jjfy2ndjmj0p7y00000gn/T/codex-clipboard-39110d54-894f-4540-b0ed-d16637e9c708.png`
- Latest compass alignment reference: `/var/folders/7b/n2t6d2yn1jjfy2ndjmj0p7y00000gn/T/codex-clipboard-5f152b6d-bb59-4adb-bd7d-bd163a0c1610.png`
- Latest footer alignment reference: `/var/folders/7b/n2t6d2yn1jjfy2ndjmj0p7y00000gn/T/codex-clipboard-2c244c9d-a84a-4191-912b-6b10967babc5.png`
- Source pixels: 702 × 1478 px, including device frame and system chrome.
- Intended implementation viewport: iPhone 14 Pro, 393 × 852 CSS px, mobile home state.
- Implementation screenshot: `qa/home-footer-iphone14pro.png` (393 × 852 px).
- Focused implementation screenshot: `qa/home-footer-focused-iphone14pro.png` (393 × 120 px).
- Side-by-side comparison: `qa/home-footer-comparison.png` (720 × 340 px).
- Density normalization: browser capture at 393 × 852 CSS px and 1× density; the supplied 720px-wide footer crop and 393px-wide implementation crop were proportionally fit to the same 720px comparison canvas without stretching.
- State: home page, compass detail closed, compass unlocked.

**Findings**

- [P1] The brand mark occupies the custom-navigation exclusion zone.
  - Evidence: the source screenshot shows the top of “周易” behind the device notch, while the WeChat capsule shares the same navigation band.
  - Impact: the app name is cropped on first view and the first-screen hierarchy appears broken.
  - Fix applied: calculate the home header start from `wx.getMenuButtonBoundingClientRect().bottom`, with status-bar and old-base-library fallbacks; place the hero below that boundary.

- [P2] The brand mark is too large for the available custom-navigation region.
  - Evidence: the 300rpx mark reaches into the system exclusion area in the supplied phone capture.
  - Impact: taller notches and compact screens are more likely to crop the mark.
  - Fix applied: reduce the mark to 280rpx while preserving its aspect ratio and center alignment.

- [P2] The browser preview was wider and denser than the selected device template.
  - Evidence: the preview shell allowed 460px and the compass allowed 78vw/320px, while the selected iPhone 14 Pro viewport is 393px wide.
  - Impact: desktop preview proportions did not represent the intended phone, and the compass/navigation rhythm could drift from the WeChat device preview.
  - Fix applied: cap the preview shell at 393px, compass and controls at 70vw/276px, and compact the home actions and footer to fit the 852px height.

- [P2] The direction assistant lacked a clear outside-tap dismissal path.
  - Evidence: the assistant only closed from the original direction button.
  - Impact: on a compact phone screen, users expect a floating panel to dismiss when tapping the surrounding page.
  - Fix applied: add a transparent full-screen dismissal layer behind the assistant while keeping the card above that layer. Only taps outside the card close it; internal tabs remain interactive. Move the card below the direction/lock controls so it no longer covers the trigger.

- [P3] Secondary return actions had low visual emphasis.
  - Evidence: the supplied ask-screen screenshot shows “返回” as dark text on the paper background.
  - Fix applied: use the existing dark-ink button treatment with cream-white text for secondary buttons.

- [P1] The translucent compass halo and the compass plate used different positioning origins.
  - Evidence: the phone capture shows the halo center visibly above the physical plate center.
  - Impact: the compass appears mechanically misassembled, especially on narrow phone screens.
  - Fix applied: move the halo into the `dial-stage` containing block and use an equal 24rpx expansion on all four sides, so the halo and plate share one center.

- [P2] Ring labels stayed upright instead of following the circular geometry.
  - Evidence: outer degree labels and the twenty-four-mountain labels all used counter-rotation.
  - Impact: the plate reads like overlaid text rather than a real compass ring.
  - Fix applied: remove counter-rotation from native ring labels and add equivalent circular rotation in the browser SVG preview; fixed HUD text remains upright.

- [P2] Dark button labels used a warm cream token rather than true white.
  - Impact: labels can look muted on black or gray controls, particularly after device-preview color conversion.
  - Fix applied: use pure white for primary, secondary, selected dark-topic, and dark-danger button labels in both native and browser-preview styles; light controls retain dark text.

- [P1] The completed six-line interpretation had no direct return-to-home action.
  - Impact: users had to return through the paipan page or depend on system navigation after finishing the core journey.
  - Fix applied: add a clear `返回首页` primary action beside `返回排盘`; use `reLaunch` in the mini program and the matching home route in the browser preview. The Meihua result uses the same label and behavior.

- [P1] The native ask page did not include the bottom `返回` action shown by the browser preview.
  - Evidence: the browser reference has two full-width stacked controls, while native WXML only rendered the confirm control.
  - Impact: phone preview appeared narrower and lost the explicit bottom return path.
  - Fix applied: add the native bottom return action, match both controls to the full inner content width, remove native button side margins, and preserve the page's 32rpx safe gutter.

- [P1] The native coin-casting page lacked the framed casting region and bottom return control shown in the reference preview.
  - Evidence: the browser reference contains a double-line paper frame, six progress diamonds, and a full-width return button; native WXML only contained the casting content and conditional completion actions.
  - Impact: phone preview lost the visual boundary around the core interaction and provided no obvious bottom exit.
  - Fix applied: add the framed native stage, six progress diamonds, and an always-available full-width bottom return action using the same safe inner width.

- [P2] The home footer stack felt vertically compressed on a real device.
  - Evidence: the five-element strip, primary navigation row, divider lines, and account/history links sit in a tight cluster.
  - Fix applied: add modest space above and within the primary navigation row and increase separation before the account/history row without changing type size.

- [P1] The ask screen restored the previous question selection when revisited.
  - Impact: a new divination could accidentally inherit an earlier category, item, or time range.
  - Fix applied: reset category, item, time range, question metadata, and pending selection every time the ask screen is entered or resumed; both native and browser preview now reopen at `先选类别`.

- [P2] The disabled `选择所问` button dimmed its white label through whole-control opacity.
  - Fix applied: keep the disabled background gray but render the label at full opacity in pure white on native and browser previews.

- [P2] Black action buttons felt visually heavy in real-device preview.
  - Fix applied: replace black primary, secondary, return, and dark selected-topic controls with a warm-gray surface, white labels, and a slightly darker gray border. Cinnabar warning and destructive states remain unchanged.

- [P1] Users had no dedicated place to report problems found during use.
  - Fix applied: add `问题留言` as the third item in the bottom link row beside account and history. Native uses WeChat's feedback surface; browser preview provides a compact issue form and local confirmation flow.

- [P1] The three home-footer links were uneven and used inconsistent typography on a real device.
  - Cause: `问题留言` is a native WeChat `button`, whose default margin, padding, line height, and font metrics differ from the two `view` links.
  - Fix applied: use three equal-width grid columns separated by two fixed-width dots; render all three labels with the same `text-link` element and place the native feedback button as an invisible absolute click layer inside the third cell.
  - Post-fix evidence: the three rendered cell centers are 72.83px, 196.50px, and 320.16px at the 393px viewport, giving equal 123.66px intervals. All labels resolve to the same Song-family stack, 15px size, 27px line height, and 400 weight.

**Required Fidelity Surfaces**

- Fonts and typography: existing Song type hierarchy and supplied brand raster are preserved; no font substitution introduced.
- Spacing and layout rhythm: safe top follows the real WeChat capsule boundary; the preview shell, compass, actions, and footer are calibrated to 393 × 852.
- Colors and visual tokens: the paper, ink, bronze, and cinnabar palette is preserved; secondary buttons now use cream-white text on the existing dark-ink gradient.
- Image quality and asset fidelity: the existing `brand-zhouyi.png` asset is retained at native aspect ratio.
- Copy and content: unchanged.

**Focused Region Evidence**

- The supplied footer crop and the browser-rendered footer crop were placed in the same comparison image at `qa/home-footer-comparison.png`.
- The earlier source shows the third native-button label displaced toward the right edge. The revised capture shows three equal-width text cells and two centered separators with no overflow.
- The transparent feedback hit target was clicked in the rendered preview and successfully opened the `问题留言` form.

**Comparison History**

1. Initial source finding: brand cropped by the notch and custom navigation band.
2. First fix: dynamic capsule-bottom spacing, legacy fallback, and modest brand-size reduction.
3. iPhone 14 Pro calibration: 393px preview shell, 90px navigation exclusion zone, 276px compass, and compact action/footer rhythm.
4. Interaction and contrast pass: outside-card dismissal for the direction assistant, interactive internal tabs, lower popup placement, and white secondary-button text.
5. Compass geometry pass: halo now shares the dial center; degree, direction, mountain, and bagua labels follow their ring orientation.
6. Button-contrast pass: all black, dark-gray, and selected dark controls use pure white labels.
7. Completion-navigation pass: both interpretation paths expose a direct `返回首页` action.
8. Home-footer alignment pass: three equal-width label cells, fixed separators, and identical native button typography.
9. Native-button isolation pass: visible feedback text moved into the same label box used by the other two items; the native button is now only an absolute click layer.
10. Post-fix evidence at 393 × 852: equal 123.66px center intervals, identical typography metrics, no horizontal overflow, and working feedback navigation.

**Implementation Checklist**

- Recompile the mini program in WeChat Developer Tools.
- Verify the entire “周易” mark is below the notch and capsule on an iPhone-class device.
- Verify the footer remains reachable on a compact-height Android device.
- Verify the halo is concentric with the plate and the circular labels rotate naturally around the full ring.

final result: passed

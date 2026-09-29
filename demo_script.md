# Demo Script

Follow these 3 scenarios to showcase the MVP's capabilities to the hackathon judges. 
Make sure the backend is running and `index.html` is open in the browser.

## Scenario 1: Returning Customer with a Recurring Issue
**Goal:** Show how the agent uses past memory to avoid suggesting failed solutions and acknowledges history.

1. In the top left dropdown, select **"Alice Smith (Recurring Issue)"**.
2. Point out the memory card on the right: She is on Windows 11, has a Pro plan, and has a known fact that "Clearing cache only worked temporarily".
3. **Type in chat:** "Hi, my app is crashing on startup again."
4. **Observe:** The agent will apologize, acknowledge this has happened before, and **will not** suggest clearing the cache (because it knows it failed). It will likely suggest reinstalling or something else.
5. **Type in chat:** "I tried reinstalling but it still crashes. It only happens when I have my VPN on."
6. **Observe:** The agent replies. Wait a few seconds for the background memory extraction to run.
7. **Highlight:** Look at the Memory Card. A new fact should appear under "Known Facts" stating that the crash is related to the VPN.

---

## Scenario 2: Angry Customer Triggering Escalation
**Goal:** Show sentiment tracking and automatic human handoff with summary generation.

1. Select **"Bob Jones (Frustrated)"** from the dropdown.
2. Point out the Frustration Score badge (it should be red, 4.5/5.0).
3. **Type in chat:** "I am so sick of this! I was overcharged again on my billing and I can't access any premium features. Fix this now!"
4. **Observe:** The agent will respond very apologetically. 
5. **Highlight:** The red "Escalation Triggered" banner will appear at the top. 
6. Click the banner (or wait for the modal if implemented to auto-show) to reveal the **Human Handoff Summary**. Point out to judges how the human agent now gets a clean summary of the issue, OS, and reasons for escalation without having to read the whole chat.

---

## Scenario 3: New Customer & Post-Chat Fact Extraction
**Goal:** Show how the system handles a clean slate and learns preferences.

1. Select **"Charlie Brown (New Customer)"** from the dropdown.
2. Point out the empty Memory Card (no past tickets, frustration is low).
3. **Type in chat:** "Hi, I'm trying to figure out how to export data. Also, please always give me short, bullet-point answers."
4. **Observe:** The agent gives a bulleted list.
5. **Highlight:** Wait a few seconds for the UI memory to reload. Under Known Facts, a new `PREFERENCE` fact should appear noting that the customer prefers bullet points.
6. **Type in chat:** "Okay, and how do I import?"
7. **Observe:** The agent will automatically use bullet points without being asked again, proving the memory persists across turns.

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import KBArticle

SEED_KB_ARTICLES = [
    {
        "id": "kb-101",
        "title": "App Freeze & Cache Reset Guide",
        "category": "Performance",
        "summary": "Step-by-step resolution for unexpected application crashes on startup and clearing corrupted local cache files.",
        "body": """### Overview
If RecallDesk hangs, displays a blank window, or crashes immediately upon startup, a corrupted local cache or stalled GPU render pipeline is almost always the root cause.

### Step-by-Step Resolution

1. **Terminate lingering background processes**:
   - **Windows**: Press `Ctrl + Shift + Esc` to open Task Manager, locate all instances of RecallDesk or related processes, and click **End task**.
   - **macOS**: Open Activity Monitor (`Cmd + Space` > Activity Monitor), find the client process, and click the **Force Quit** button.

2. **Clear the local cache directories**:
   - **Windows**: Press `Win + R`, paste `%LocalAppData%\\RecallDesk\\cache`, and press Enter. Permanently delete the contents of both `Cache` and `GPUCache`.
   - **macOS**: Open Finder, press `Cmd + Shift + G`, enter `~/Library/Caches/RecallDesk`, and move all cache contents to Trash.

3. **Restart in Safe Mode**:
   - Launch RecallDesk holding the `Shift` key (or macOS `Option` key) to skip initial plugin initialization.

4. **Disable Hardware Acceleration**:
   - Once the interface opens, go to **Settings > System** and toggle **Hardware Acceleration** to **Off**.
   - Restart the client normally to apply the software rendering fallback.""",
        "used_count": 14,
        "keywords": ["crash", "freeze", "hang", "cache", "startup", "restart", "appdata", "blank"]
    },
    {
        "id": "kb-102",
        "title": "Resolving Rendering Lag & Hardware Acceleration Issues",
        "category": "Performance",
        "summary": "Fix export errors, GPU hang-ups, and window stuttering by configuring graphics drivers and acceleration settings.",
        "body": """### Symptoms
PDF exports fail midway, screen stuttering occurs during navigation, or high-DPI external monitors cause rendering timeouts.

### Step-by-Step Resolution

1. **Disable Hardware Acceleration**:
   - Open RecallDesk **Preferences > System > Rendering**.
   - Turn **Hardware Acceleration** to **Off** and restart the app.

2. **Update Dedicated Graphics Drivers**:
   - NVIDIA / AMD / Intel drivers must be updated to the latest Game Ready or Studio WHQL drivers.
   - For hybrid laptops (Intel/AMD integrated + NVIDIA dedicated), configure the graphics panel to assign High Performance GPU to RecallDesk.

3. **Adjust Export Settings**:
   - When exporting large PDF reports or high-resolution logs, set raster quality to *Standard (150 DPI)* rather than *Ultra (600 DPI)*.
   - Ensure the destination directory has write permissions and at least 500 MB free disk space.""",
        "used_count": 9,
        "keywords": ["lag", "export", "pdf", "acceleration", "gpu", "stutter", "slow", "driver"]
    },
    {
        "id": "kb-103",
        "title": "Duplicate Charges & Refund Processing Policy",
        "category": "Billing",
        "summary": "How to identify pending authorization holds, request duplicate transaction reversals, and timeline for credit return.",
        "body": """### Overview
Seeing multiple identical charges on your credit card or bank statement usually indicates an authorization hold rather than a completed duplicate charge.

### Step-by-Step Resolution

1. **Verify Invoice History**:
   - Navigate to **Console > Billing & Invoices**.
   - Compare your bank statement against the settled invoices listed in your billing history.

2. **Authorization Hold vs Settled Charge**:
   - Banking apps often display pending pre-authorizations alongside settled items.
   - Pending holds expire and disappear automatically within 24 to 72 hours without funds leaving your account.

3. **Automatic System Refund**:
   - If two identical invoice numbers show as *Paid* for the same billing cycle, our automated reconciliation refunds the duplicate within 48 hours.

4. **Requesting Manual Reversal**:
   - If duplicate settled charges persist beyond 3 business days, provide the Transaction Reference Numbers to human billing support for immediate reversal.""",
        "used_count": 22,
        "keywords": ["charge", "refund", "billing", "overcharge", "invoice", "duplicate", "payment", "card", "money"]
    },
    {
        "id": "kb-104",
        "title": "Enterprise & Pro Feature Access Activation",
        "category": "Billing",
        "summary": "Troubleshoot missing plan permissions, delayed tier upgrades, and license key provisioning.",
        "body": """### Overview
When a workspace subscription is upgraded from Free to Pro or Enterprise, tenant permissions can take up to 5 minutes to propagate across active client sessions.

### Step-by-Step Resolution

1. **Force Session Token Refresh**:
   - Click your profile avatar in the upper right and select **Log Out**.
   - Log back in to refresh JWT claims with newly provisioned license permissions.

2. **Verify Assigned Seat**:
   - Workspace admins must allocate a paid seat to your user email in **Console > Team Members > Role & Licensing**.
   - If all paid seats are occupied, your account will temporarily remain in viewer mode until an additional seat is added.

3. **Clear Local License Cache**:
   - Open **Settings > System** and click **Refresh Entitlements Cache** to sync your license with the central billing server immediately.""",
        "used_count": 11,
        "keywords": ["upgrade", "enterprise", "plan", "pro", "features", "access", "license", "seat", "permission"]
    },
    {
        "id": "kb-105",
        "title": "Fixing Cloud Sync Errors & Data Conflicts",
        "category": "Sync",
        "summary": "Resolve sync failure banners, database lockouts, and conflicting ticket state between desktop and cloud.",
        "body": """### Symptoms
A yellow or red sync warning appears in the bottom status bar, changes made on one device are missing on another, or conflict banners appear.

### Step-by-Step Resolution

1. **Check Real-time Connection**:
   - Confirm your network allows persistent WSS connections to `api.hindsight.vectorize.io`.
   - Disable corporate VPN split-tunneling temporarily if WebSocket handshake failures appear in console logs.

2. **Resolve Conflict Prompts**:
   - When two agents edit the same record concurrently, a **Resolve Conflict** prompt will display.
   - Choose **Keep Server Version** to accept cloud changes, or **Overwrite with Local** to force your version.

3. **Force Resync**:
   - Click the sidebar status indicator and select **Sync Now**.
   - Wait for the double checkmark to appear before closing the tab or window.""",
        "used_count": 18,
        "keywords": ["sync", "conflict", "websocket", "cloud", "server", "out of sync", "disconnected"]
    },
    {
        "id": "kb-106",
        "title": "Offline Mode & Local Queue Reconnection",
        "category": "Sync",
        "summary": "Work seamlessly during internet outages and safely re-upload queued support tickets upon reconnecting.",
        "body": """### Overview
RecallDesk includes an automatic offline queue buffer. If your connection drops, all ticket replies and memory records are safely persisted to local SQLite storage.

### Step-by-Step Resolution

1. **Continue Drafting**:
   - You can continue entering customer notes and creating tickets while offline.
   - A subtle yellow **Offline (Queued)** indicator will show pending sync items.

2. **Auto-Reconnection**:
   - Once network access is re-established, the offline queue uploads items sequentially in FIFO order.
   - Avoid clearing browser application storage or cookies while the queue status displays **Flushing upload buffer**.

3. **Manual Queue Trigger**:
   - If auto-upload does not resume after reconnecting, go to **Settings > System** and click **Flush Offline Queue**.""",
        "used_count": 7,
        "keywords": ["offline", "disconnect", "queue", "reconnect", "network", "internet", "buffer"]
    },
    {
        "id": "kb-107",
        "title": "Password Reset & MFA Recovery Guide",
        "category": "Account",
        "summary": "Instructions for self-service password reset emails, lost two-factor authenticator devices, and security lockouts.",
        "body": """### Overview
Regain account access if your password expired, reset links aren't arriving, or your MFA authenticator device was replaced or lost.

### Step-by-Step Resolution

1. **Trigger Self-Service Password Reset**:
   - On the sign-in page, click **Forgot your password?**.
   - Enter your account email and submit. Check both primary and spam folders for an email from `support@recalldesk.ai`.
   - Password reset links remain valid for 60 minutes.

2. **Using Emergency Backup Codes for 2FA**:
   - If your authenticator app is lost, select **Try another way > Use backup recovery code**.
   - Input one of the 8 single-use codes provided when 2FA was initially set up.

3. **Security Lockout Cooldown**:
   - Entering 5 incorrect passwords triggers a 15-minute security cooldown. Wait for the lockout timer to expire before re-attempting.

4. **Admin MFA Override**:
   - Workspace owners can reset an employee's 2FA device from **Console > Team Management > Security Reset**.""",
        "used_count": 31,
        "keywords": ["password", "reset", "mfa", "2fa", "code", "authenticator", "lockout", "forgot"]
    },
    {
        "id": "kb-108",
        "title": "Single Sign-On (SSO) & Session Troubleshooting",
        "category": "Account",
        "summary": "Diagnose SAML 2.0 / Okta authentication errors, expired identity provider certificates, and session loops.",
        "body": """### Overview
Enterprise single sign-on issues typically stem from identity provider session expiration, clock skew differences, or unassigned application groups.

### Step-by-Step Resolution

1. **Clear IdP Cookies & Session Storage**:
   - Clear cookies and site data for both your identity provider domain (e.g., `*.okta.com`, `login.microsoftonline.com`) and RecallDesk.

2. **Verify Clock Skew Synchronization**:
   - SAML assertions fail with `SAML_TIME_INVALID` if your computer system clock differs by more than 120 seconds from UTC.
   - Ensure **Set time automatically** is enabled in your OS Date & Time settings.

3. **Confirm Group Assignment**:
   - Check with your IT Helpdesk that your user profile belongs to the authorized group in Okta or Azure AD.

4. **Initiate Login from IdP Portal**:
   - Try initiating authentication from your company's app dashboard (IdP-initiated) rather than typing the direct URL (SP-initiated).""",
        "used_count": 16,
        "keywords": ["sso", "saml", "okta", "login", "auth", "session", "azure ad", "identity"]
    }
]

class KBService:
    @staticmethod
    def seed_articles(db: Session, force: bool = False):
        """Seed the 8 realistic knowledge base articles if not present."""
        existing_count = db.query(KBArticle).count()
        if existing_count > 0 and not force:
            return

        if force:
            db.query(KBArticle).delete()

        now = datetime.utcnow()
        for idx, art_data in enumerate(SEED_KB_ARTICLES):
            days_ago = (idx * 2) + 1
            updated_date = now - timedelta(days=days_ago)
            article = KBArticle(
                id=art_data["id"],
                title=art_data["title"],
                category=art_data["category"],
                summary=art_data["summary"],
                body=art_data["body"],
                used_count=art_data["used_count"],
                updated_at=updated_date
            )
            db.add(article)
        db.commit()

    @staticmethod
    def get_articles(db: Session, q: Optional[str] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch knowledge base articles with optional search and category filtering."""
        query = db.query(KBArticle)

        if category and category.lower() != "all":
            query = query.filter(KBArticle.category.ilike(category))

        if q and q.strip():
            term = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    KBArticle.title.ilike(term),
                    KBArticle.summary.ilike(term),
                    KBArticle.body.ilike(term),
                    KBArticle.category.ilike(term)
                )
            )

        articles = query.order_by(KBArticle.used_count.desc(), KBArticle.updated_at.desc()).all()
        return [
            {
                "id": a.id,
                "title": a.title,
                "category": a.category,
                "summary": a.summary,
                "body": a.body,
                "used_count": a.used_count or 0,
                "updated_at": a.updated_at.strftime("%Y-%m-%d") if a.updated_at else datetime.utcnow().strftime("%Y-%m-%d")
            }
            for a in articles
        ]

    @staticmethod
    def get_article(db: Session, article_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a single knowledge base article by ID."""
        a = db.query(KBArticle).filter(KBArticle.id == article_id).first()
        if not a:
            return None
        return {
            "id": a.id,
            "title": a.title,
            "category": a.category,
            "summary": a.summary,
            "body": a.body,
            "used_count": a.used_count or 0,
            "updated_at": a.updated_at.strftime("%Y-%m-%d") if a.updated_at else datetime.utcnow().strftime("%Y-%m-%d")
        }

    @staticmethod
    def match_article(db: Session, text: str) -> Optional[Dict[str, Any]]:
        """
        Check if user message or customer issue matches an article keyword.
        Increments that article's usage counter and returns article summary info.
        """
        if not text:
            return None

        lower_text = text.lower()
        
        # Check against seed keywords
        matched_id = None
        for art in SEED_KB_ARTICLES:
            for kw in art["keywords"]:
                if kw in lower_text:
                    matched_id = art["id"]
                    break
            if matched_id:
                break

        if not matched_id:
            # Fallback to database title search
            articles = db.query(KBArticle).all()
            for a in articles:
                words = a.title.lower().split()
                if any(w in lower_text for w in words if len(w) > 4):
                    matched_id = a.id
                    break

        if matched_id:
            article = db.query(KBArticle).filter(KBArticle.id == matched_id).first()
            if article:
                article.used_count = (article.used_count or 0) + 1
                db.commit()
                return {
                    "id": article.id,
                    "title": article.title,
                    "category": article.category,
                    "summary": article.summary,
                    "used_count": article.used_count,
                    "updated_at": article.updated_at.strftime("%Y-%m-%d") if article.updated_at else datetime.utcnow().strftime("%Y-%m-%d")
                }

        return None

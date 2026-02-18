# Terms of Service (TOS) – Forger

**1. Acceptance of Terms**  
By using Forger (the "Bot"), whether in Discord servers or as a User App on your personal account, you agree to these Terms of Service ("Terms"). If you do not agree, do not use the Bot.

**2. Bot Purpose**  
Forger is a Discord bot designed for browsing and analyzing game content related to the Forge game system, including weapons, armor, ores, and pickaxes. The Bot operates both as a server bot and as a personal User App, providing information caching, game data browsing, performance analytics, and internal improvement features.

**3. Core Functionalities**

- **Game Content Browsing**: View detailed information about in-game items (ores, weapons, armor, pickaxes)
- **Bug Reporting System**: Submit bug reports with descriptions, reproduction steps, and screenshots
- **Performance Monitoring**: Track and analyze REST API and gateway latency
- **User Management**: Maintain a user blacklist for access control

**4. Rules of Use**

- You may not use the Bot for illegal activities or to harm other users.
- You may not attempt to reverse-engineer, manipulate, or abuse the Bot's APIs or systems.
- You are responsible for any content you share while interacting with the Bot, including bug report submissions.
- You may not use the Bot to collect, scrape, or extract data beyond normal interaction use.
- Blacklisted users are prohibited from using the Bot; repeated attempts to circumvent blacklists may result in account restrictions.

**5. Data Collection and Storage**

Forger collects the following information:

- **User Identification**: Discord username and user ID
- **Guild Context**: Guild ID and Guild Owner ID (when used in servers)
- **Interaction Context**: Channel ID, interaction type, timestamp, and member roles
- **Bug Reports**: Complete reports including description, reproduction steps, and screenshot attachments
- **Analytics Data**: REST API analytics (HTTP methods, routes, rate-limit buckets, request timing)
- **Blacklist Records**: User IDs of blacklisted users (stored in Redis)

This data is used exclusively for:

- Improving Bot performance and stability
- Monitoring system health and availability
- Processing user-submitted bug reports
- Enforcing user access restrictions
- Preventing abuse and unauthorized use

**6. Third-Party Data**

Forger does not intentionally share user data with third parties. However:

- Bug reports are stored in a dedicated Discord forum channel within our support server
- Analytics data may be stored in InfluxDB instances under the developer's control
- All data remains under the developer's responsibility

**7. Data Retention and Deletion**

- User data is retained as long as needed for analytics and abuse prevention
- Blacklist entries persist until removal by authorized administrators
- Bug reports are retained indefinitely for historical reference and future improvement
- Users can request deletion of their data by contacting the Bot developer

**8. Intellectual Property**

- The Forger name, branding, and associated identifiers remain the intellectual property of the developer
- The Bot's source code is licensed under the MIT License
- Use, modification, and distribution of the source code are permitted in accordance with the MIT License terms
- Nothing in these Terms restricts rights expressly granted under the MIT License

**9. Limitation of Liability**

Forger is provided on an "as-is" basis. The developer:

- Makes reasonable efforts to maintain the Bot's stability, security, and functionality
- Does NOT guarantee uninterrupted or error-free operation
- Shall not be held liable for indirect, incidental, or consequential damages resulting from use
- Shall not be held liable for damages caused by temporary service interruptions or factors outside reasonable control

**10. Modifications to Terms**

The developer may update these Terms to reflect:

- Improvements to the Bot
- Legal requirements
- Operational changes
- Security enhancements

When reasonably possible, material changes will be communicated to users. Continued use of the Bot after updates constitutes acceptance of revised Terms.

**11. User Conduct and Termination**

The developer may suspend or permanently ban users who:

- Violate these Terms
- Engage in abusive behavior
- Attempt to exploit the Bot
- Repeatedly submit false reports
- Violate Discord's Terms of Service

**12. Governing Law**

These Terms are governed by the laws of Brazil.

**13. Contact**

For questions, concerns, or data deletion requests, please contact the Bot developer through the support server or direct message.

**Last Updated**: 2026-02-1

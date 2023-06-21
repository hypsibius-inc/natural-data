from dataclasses import asdict
import datetime
from typing import AsyncIterable, Dict, List, Optional, Sequence
from slack_sdk.web.async_client import AsyncWebClient
from ..models import Message, User, Team, Conversation


class SlackCollect:
    _users: Dict[str, User] = dict()
    _teams: Dict[str, Team] = dict()
    _conversations: Dict[str, Conversation] = dict()

    def __init__(self, client: AsyncWebClient) -> None:
        self._client = client

    async def get_team(self, id: str) -> Team:
        if team := self._teams.get(id):
            return team
        return self._teams.setdefault(id, await self._get_team(id))

    async def _get_team(self, id: str) -> Team:
        team_dict = (await self._client.team_info(team=id)).get("team")
        return Team(
            id=team_dict["id"],
            name=team_dict["name"],
            domain=team_dict["domain"],
            email_domain=team_dict["email_domain"],
        )

    async def get_user(self, id: str) -> User:
        if user := self._users.get(id):
            return user
        return self._users.setdefault(id, await self._get_user(id))

    async def _get_user(self, id: str) -> User:
        user_dict = (await self._client.users_info(user=id)).get("user")
        return User(
            id=user_dict["id"],
            team=await self.get_team(user_dict["team_id"]),
            display_name=user_dict["profile"]["display_name"],
            email=user_dict["profile"].get("email"),
            name=user_dict["profile"]["real_name"],
            deleted=user_dict.get("deleted", False),
            status=user_dict.get("status_text"),
        )

    async def collect_conversations(
        self,
        conversation_types: Sequence[str] = (
            "public_channel",
            "private_channel",
            "mpim",
            "im",
        ),
    ) -> List[Conversation]:
        async for page in await self._client.conversations_list(
            types=conversation_types, limit=200,
        ):
            channels = page.get("channels")
            for c in channels:
                if "name" in c:
                    self._conversations[c["id"]] = Conversation(
                        id=c["id"],
                        name=c["name"],
                        created=datetime.datetime.fromtimestamp(float(c["created"])),
                        is_private=c.get("is_private", True),
                        creator=await self.get_user(c["creator"]),
                    )
        return list(self._conversations.values())

    async def collect_messages(
        self, since: Optional[datetime.datetime] = None
    ) -> AsyncIterable[Message]:
        """
        Yields messages in descending order, from latest to earliest.
        For messages that have replies (aka thread), yields the thread replies
        from oldest to newest.

        Example:

        17:31 >   Hello!                      # 5
        17:32 >   Hi :)                       # 2
        17:33 >>   This is a reply!        # 3
        17:34 >>   Awesome!                # 4
        17:35 >   We spoke in a thread!       # 1
        """
        for conversation in self._conversations.values():
            newer_message: Optional[Message] = None
            newer_message_has_thread: bool = False
            async for page in await self._client.conversations_history(
                channel=conversation.id,
                oldest=str(since.timestamp()) if since else None,
                limit=200,
            ):
                for m in page["messages"]:
                    if m["type"] == "message":
                        current_message = Message(
                            text=m["text"],
                            author=await self.get_user(m["user"]),
                            ts=datetime.datetime.fromtimestamp(float(m["ts"])),
                            conversation=conversation,
                            next_msg=newer_message,
                        )

                        if newer_message and not newer_message_has_thread:
                            newer_message.prev_msg = current_message

                            yield newer_message
                        newer_message = current_message
                        newer_message_has_thread = False
                        if m.get("reply_count", 0) > 0:
                            newer_message_has_thread = True
                            prev_thread_msg = newer_message
                            async for thread_page in await self._client.conversations_replies(
                                channel=conversation.id, ts=m["thread_ts"],
                                limit=200,
                            ):
                                for tm in thread_page["messages"]:
                                    if tm["thread_ts"] == tm["ts"]:
                                        continue
                                    if tm["type"] == "message":
                                        cur_thread_msg = Message(
                                            text=tm["text"],
                                            ts=datetime.datetime.fromtimestamp(
                                                float(tm["ts"])
                                            ),
                                            conversation=conversation,
                                            post=newer_message,
                                            prev_msg=prev_thread_msg,
                                            author=await self.get_user(tm["user"]),
                                        )
                                        prev_thread_msg.next_msg = cur_thread_msg

                                        yield prev_thread_msg
                                        prev_thread_msg = cur_thread_msg

                            yield prev_thread_msg

            if newer_message and not newer_message_has_thread:
                yield newer_message

import { Flame, User } from "../../components/Icons";

type Props = {
  userName: string;
  level: number;
  expPercent: number;
  streakDays: number;
};

/** ヘッダー下のユーザー状況（Lv / EXP / 連続学習日数）。すべて実データ。 */
export function ResultUser({ userName, level, expPercent, streakDays }: Props) {
  return (
    <div className="r-user">
      <div className="r-user-left">
        <span className="r-user-avatar">
          <User size={16} />
        </span>
        <span className="r-user-meta">
          <span className="r-user-name">
            <b>{userName}</b>
            <span className="r-lv rn">Lv.{level}</span>
          </span>
          <span className="r-exp" aria-label={`次のレベルまで ${expPercent}%`}>
            <span style={{ width: `${expPercent}%` }} />
          </span>
        </span>
      </div>

      <span className="r-streak">
        <Flame size={14} />
        <b className="rn">{streakDays}日連続</b>
      </span>
    </div>
  );
}

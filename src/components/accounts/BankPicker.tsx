import type { Bank } from '@/models';
import { Icon } from '@/components/ui';
import styles from './BankPicker.module.css';

export interface BankPickerProps {
  banks: readonly Bank[];
  /** `null` = el usuario eligió "Otro" y escribirá el nombre él mismo. */
  onSelect: (bank: Bank | null) => void;
}

/**
 * Elegir banco al crear una cuenta. Porta `#modalBank` de v1.
 *
 * ⚠️ AVISO QUE NO SE PUEDE QUITAR: la conexión bancaria es SIMULADA. La app
 * nunca pide ni almacena credenciales de banco, y elegir aquí un banco no
 * conecta con nada — sólo etiqueta una cuenta que el usuario lleva a mano.
 * v1 ya lo decía ("Simulado · toca para conectar") y se conserva textualmente:
 * una app de dinero que insinúe una conexión real que no existe es un
 * problema de confianza, no de copy.
 *
 * Los bancos creados por el usuario aparecen junto a los de fábrica, que es lo
 * que en v1 no pasaba: allí "otro banco" se guardaba como texto suelto dentro
 * de la cuenta y no se podía volver a elegir.
 */
export function BankPicker({ banks, onSelect }: BankPickerProps) {
  return (
    <div className={styles.list} role="list">
      {banks.map((bank) => (
        <button
          key={bank.id}
          type="button"
          role="listitem"
          className={styles.option}
          onClick={() => onSelect(bank)}
        >
          <span className={styles.icon} style={{ background: `${bank.color}22`, color: bank.color }}>
            <Icon name={bank.icon} size="md" />
          </span>
          <span className={styles.info}>
            <span className={styles.name}>{bank.name}</span>
            <span className={styles.hint}>
              {bank.isBuiltIn ? 'Simulado · toca para conectar' : 'Tu banco · toca para usarlo'}
            </span>
          </span>
        </button>
      ))}

      <button type="button" role="listitem" className={styles.option} onClick={() => onSelect(null)}>
        <span className={styles.iconOther}>
          <Icon name="add" size="md" />
        </span>
        <span className={styles.info}>
          <span className={styles.name}>Otro</span>
          <span className={styles.hint}>Agregar un banco o cuenta que no está en la lista</span>
        </span>
      </button>
    </div>
  );
}

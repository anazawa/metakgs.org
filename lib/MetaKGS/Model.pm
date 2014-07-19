package MetaKGS::Model;
use strict;
use warnings;
use Carp qw/croak/;
use MetaKGS;
use MetaKGS::Teng::Cursor;
use SQL::NamedPlaceholder qw/bind_named/;

sub import {
    my ( $class, $alias ) = @_;
    my $caller = scalar caller;

    my $TableName = $class;
       $TableName =~ s/.+:://;

    my $export = $alias || $TableName;
       $export = "$caller\::$export";

    my $table_name = decamelize $TableName;
    my $constructor = sub { $class->new( table_name => $table_name, @_ ) };

    {
        no strict 'refs';
        *$export = $constructor;
    }

    return;
}

sub new {
    my $class = shift;
    my %args = @_ == 1 ? %{$_[0]} : @_;
    bless \%args, $class;
}

sub teng {
    my $self = shift;
    $self->{teng} ||= MetaKGS->context->teng;
}

sub table_name {
    $_[0]->{table_name};
}

sub where {
    my ( $self, @args ) = @_;
    $self->_condition( 'where', @args );
}

sub _condition {
    my ( $self, $key, @args ) = @_;

    return $self->{$key} unless @args;

    my $stuff = shift @args;
    my $condition = $self->teng->sql_builder->new_condition;

    if ( ref $stuff eq 'HASH' ) {
        for my $key ( keys %$stuff ) {
            $condition->add( $key => $stuff->{$key} );
        }
    }
    elsif ( ref $stuff eq 'ARRAY' ) {
        if ( ref $stuff->[1] eq 'HASH' ) {
            $condition->add_raw( bind_named @$stuff );
        }
        else {
            my ( $sql, @bind ) = @$stuff;
            $condition->add_raw( $sql, \@bind );
        }
    }
    else {
        $condition->add_raw( $stuff );
    }

    if ( exists $self->{$key} ) {
        $self->{$key} = $self->{$key}->compose_and( $condition );
    }
    else {
        $self->{$key} = $condition;
    }

    $self;
}

sub limit {
    my $self = shift;
    return $self->{limit} unless @_;
    $self->{limit} = shift;
    $self;
}

sub offset {
    my $self = shift;
    return $self->{offset} unless @_;
    $self->{offset} = shift;
    $self;
}

sub order_by {
    my ( $self, @args ) = @_;

    return $self->{order_by} unless @args;

    if ( exists $self->{order_by} ) {
        $self->{order_by} = [ @{$self->{order_by}}, @args ];
    }
    else {
        $self->{order_by} = \@args;
    }

    $self;
}

sub clone {
    my $self = shift;
    ref( $self )->new( %$self );
}

sub select {
    my ( $self, @args ) = @_;

    croak "Odd number of arguments passed to 'do_select'" if @args % 2;

    my @columns;
    while ( my ($key, $value) = splice @args, 0, 2 ) {
        push @columns, [ $value, $key ];
    }

    my %options = (
        order_by => $self->order_by,
        limit    => $self->limit,
        offset   => $self->offset,
    );

    my ( $sql, @bind ) = $self->teng->sql_builder->select(
        $self->table_name,
        @columns ? \@columns : [ '*' ],
        $self->where,
        \%options,
    );

    MetaKGS::Teng::Cursor->new(
        teng  => $self->teng,
        query => [ $sql, \@bind ],
    );
}

sub delete {
    my ( $self, @args ) = @_;
    $self = $self->clone->where( @args ) if @args;
    $self->teng->delete( $self->table_name, $self->where );
}

sub update {
    my $self = shift;
    my %set = @_ == 1 ? %{$_[0]} : @_;

    my ( $sql, @bind ) = $self->teng->sql_builder->update(
        $self->table_name,
        \%set,
        $self->where
    );

    my $sth = $self->teng->execute( $sql, \@bind );
    my $rows = $sth->rows;
    $sth->finish;

    $rows;
}

sub insert {
    my $self = shift;
    my %values = @_ == 1 ? %{$_[0]} : @_;

    my ( $sql, @bind ) = $self->teng->sql_builder->insert(
        $self->table_name,
        \%values
    );

    $self->teng->execute( $sql, \@bind );

    return;
}

1;
